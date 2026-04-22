import * as Sentry from "@sentry/nextjs";
import { auth } from "@clerk/nextjs/server";
import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { hashIdentifier } from "@/lib/hash";
import { enqueueSongGeneration } from "@/lib/queue";
import { serializeSong } from "@/lib/song-response";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const song = await getPrisma().song.findFirst({
    where: { id, userId },
  });

  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  if (song.blobPathname) {
    await del(song.blobPathname).catch(() => undefined);
  }

  await getPrisma().song.update({
    where: { id },
    data: {
      status: "queued",
      errorCode: null,
      errorMessage: null,
      blobPathname: null,
      fileSizeBytes: null,
      durationSeconds: null,
    },
  });

  try {
    await enqueueSongGeneration({ songId: id, userId });
  } catch (error) {
    await getPrisma().song.update({
      where: { id },
      data: {
        status: "failed",
        errorCode: "QueueUnavailable",
        errorMessage:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Unable to enqueue song retry.",
      },
    });

    Sentry.captureException(error, {
      tags: {
        songId: id,
        userHash: hashIdentifier(userId),
        status: "failed",
      },
    });
  }

  const refreshedSong = await getPrisma().song.findUniqueOrThrow({
    where: { id },
  });

  return NextResponse.json({ song: serializeSong(refreshedSong) }, { status: 202 });
}
