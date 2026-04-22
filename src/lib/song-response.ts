import type { Song } from "@prisma/client";
import { statusProgress } from "@/lib/song-config";

export function serializeSong(song: Song) {
  return {
    id: song.id,
    title: song.title ?? "Untitled vocal",
    status: song.status,
    mode: song.mode,
    genre: song.genre,
    mood: song.mood,
    voice: song.voice,
    lengthPreset: song.lengthPreset,
    tempoBpm: song.tempoBpm,
    energy: song.energy,
    clean: song.clean,
    generatedLyrics: song.generatedLyrics,
    durationSeconds: song.durationSeconds,
    fileSizeBytes: song.fileSizeBytes,
    errorCode: song.errorCode,
    errorMessage: song.errorMessage,
    createdAt: song.createdAt.toISOString(),
    updatedAt: song.updatedAt.toISOString(),
    progress: statusProgress(song.status),
    audioUrl: song.status === "completed" ? `/api/songs/${song.id}/audio` : null,
    downloadUrl:
      song.status === "completed" ? `/api/songs/${song.id}/audio?download=1` : null,
  };
}
