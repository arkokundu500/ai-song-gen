import * as Sentry from "@sentry/nextjs";
import { put } from "@vercel/blob";
import type { Song } from "@prisma/client";
import { encodeSegmentsToMp3, estimateDurationSeconds } from "@/lib/audio";
import { getPrisma } from "@/lib/db";
import {
  GROQ_PLANNER_MODEL,
  lengthPresets,
  ORPHEUS_TTS_MODEL,
  type LengthPreset,
} from "@/lib/song-config";
import { buildLyricsModePlan, createSongProductionPlan, synthesizeVocalSegment } from "@/lib/groq";
import { hashIdentifier } from "@/lib/hash";
import { normalizeDirection, normalizeTtsSegments, segmentTextForTts } from "@/lib/song-segmenter";
import type { CreateSongInput } from "@/lib/song-validation";

export async function processSongGeneration(songId: string, userId: string) {
  const prisma = getPrisma();
  const song = await prisma.song.findFirst({
    where: { id: songId, userId },
  });

  if (!song) {
    throw new Error(`Song ${songId} was not found for generation.`);
  }

  await updateStatus(songId, "planning");

  try {
    const plan = await Sentry.startSpan(
      {
        name: "Create song production plan",
        op: "ai.groq.plan",
        attributes: sentryAttributes(song),
      },
      () => createSongProductionPlan(toCreateSongInput(song))
    );

    const maxSegments = lengthPresets[song.lengthPreset as LengthPreset].maxSegments;
    const generatedLyrics = song.mode === "lyrics" && song.inputLyrics ? song.inputLyrics : plan.generatedLyrics;
    const effectivePlan =
      song.mode === "lyrics" && song.inputLyrics
        ? buildLyricsModePlan(plan, song.inputLyrics, maxSegments)
        : plan;

    const rawSegments =
      song.mode === "lyrics" && song.inputLyrics
        ? segmentTextForTts(song.inputLyrics).map((text, index) => ({
            section: `Lyric ${index + 1}`,
            direction: normalizeDirection(plan.vocalDirection || song.mood),
            text,
          }))
        : effectivePlan.ttsSegments;

    const ttsSegments = normalizeTtsSegments(rawSegments, generatedLyrics, maxSegments);

    await prisma.song.update({
      where: { id: songId },
      data: {
        title: effectivePlan.title,
        generatedLyrics,
        planJson: {
          ...effectivePlan,
          ttsSegments,
          models: {
            planner: GROQ_PLANNER_MODEL,
            tts: ORPHEUS_TTS_MODEL,
          },
        },
      },
    });

    await updateStatus(songId, "synthesizing");

    const wavSegments: Buffer[] = [];
    for (const segment of ttsSegments) {
      const wav = await Sentry.startSpan(
        {
          name: "Synthesize vocal segment",
          op: "ai.groq.tts",
          attributes: {
            ...sentryAttributes(song),
            section: segment.section,
            model: ORPHEUS_TTS_MODEL,
          },
        },
        () =>
          synthesizeVocalSegment({
            text: segment.text,
            direction: segment.direction,
            voice: song.voice,
          })
      );
      wavSegments.push(wav);
    }

    await updateStatus(songId, "mixing");

    const mp3Buffer = await Sentry.startSpan(
      {
        name: "Encode vocal song MP3",
        op: "audio.ffmpeg",
        attributes: sentryAttributes(song),
      },
      () => encodeSegmentsToMp3({ songId, segments: wavSegments })
    );

    const pathname = `songs/${userId}/${songId}.mp3`;
    const blob = await Sentry.startSpan(
      {
        name: "Upload song MP3",
        op: "blob.upload",
        attributes: sentryAttributes(song),
      },
      () =>
        put(pathname, mp3Buffer, {
          access: "private",
          allowOverwrite: true,
          contentType: "audio/mpeg",
        })
    );

    await prisma.song.update({
      where: { id: songId },
      data: {
        status: "completed",
        blobPathname: blob.pathname,
        durationSeconds: estimateDurationSeconds(generatedLyrics),
        fileSizeBytes: mp3Buffer.byteLength,
        errorCode: null,
        errorMessage: null,
      },
    });
  } catch (error) {
    await prisma.song.update({
      where: { id: songId },
      data: {
        status: "failed",
        errorCode: error instanceof Error ? error.name : "GenerationError",
        errorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown generation error",
      },
    });

    Sentry.captureException(error, {
      tags: {
        songId,
        userHash: hashIdentifier(userId),
        genre: song.genre,
        status: "failed",
      },
      extra: {
        plannerModel: GROQ_PLANNER_MODEL,
        ttsModel: ORPHEUS_TTS_MODEL,
      },
    });

    throw error;
  }
}

function toCreateSongInput(song: Song): CreateSongInput {
  return {
    mode: song.mode,
    prompt: song.inputPrompt ?? undefined,
    lyrics: song.inputLyrics ?? undefined,
    genre: song.genre as CreateSongInput["genre"],
    mood: song.mood as CreateSongInput["mood"],
    voice: song.voice,
    lengthPreset: song.lengthPreset as CreateSongInput["lengthPreset"],
    tempoBpm: song.tempoBpm,
    energy: song.energy,
    clean: song.clean,
  };
}

async function updateStatus(songId: string, status: "planning" | "synthesizing" | "mixing") {
  await getPrisma().song.update({
    where: { id: songId },
    data: { status },
  });
}

function sentryAttributes(song: Song) {
  return {
    songId: song.id,
    userHash: hashIdentifier(song.userId),
    genre: song.genre,
    lengthPreset: song.lengthPreset,
    voice: song.voice,
  };
}
