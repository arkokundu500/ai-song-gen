import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { enqueueSongGeneration } from "@/lib/queue";
import { serializeSong } from "@/lib/song-response";
import { createSongSchema } from "@/lib/song-validation";
import { hashIdentifier } from "@/lib/hash";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const songs = await getPrisma().song.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    songs: songs.map(serializeSong),
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSongSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid song request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const song = await getPrisma().song.create({
    data: {
      userId,
      mode: input.mode,
      genre: input.genre,
      mood: input.mood,
      voice: input.voice,
      lengthPreset: input.lengthPreset,
      tempoBpm: input.tempoBpm,
      energy: input.energy,
      clean: input.clean,
      inputPrompt: input.mode === "prompt" ? input.prompt : null,
      inputLyrics: input.mode === "lyrics" ? input.lyrics : null,
    },
  });

  try {
    await Sentry.startSpan(
      {
        name: "Enqueue song generation",
        op: "queue.send",
        attributes: {
          songId: song.id,
          userHash: hashIdentifier(userId),
          genre: song.genre,
          lengthPreset: song.lengthPreset,
        },
      },
      () => enqueueSongGeneration({ songId: song.id, userId })
    );
  } catch (error) {
    await getPrisma().song.update({
      where: { id: song.id },
      data: {
        status: "failed",
        errorCode: "QueueUnavailable",
        errorMessage:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Unable to enqueue song generation.",
      },
    });

    Sentry.captureException(error, {
      tags: {
        songId: song.id,
        userHash: hashIdentifier(userId),
        genre: song.genre,
        status: "failed",
      },
    });

    const failedSong = await getPrisma().song.findUniqueOrThrow({
      where: { id: song.id },
    });

    return NextResponse.json(
      {
        song: serializeSong(failedSong),
        warning: "Song was saved, but the queue could not be reached.",
      },
      { status: 202 }
    );
  }

  return NextResponse.json({ song: serializeSong(song) }, { status: 202 });
}
