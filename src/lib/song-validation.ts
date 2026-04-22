import { z } from "zod";
import { genres, lengthPresets, moods, songModes, voices } from "@/lib/song-config";

export const createSongSchema = z
  .object({
    mode: z.enum(songModes),
    prompt: z.string().trim().max(1200).optional(),
    lyrics: z.string().trim().max(5000).optional(),
    genre: z.enum(genres),
    mood: z.enum(moods),
    voice: z.enum(voices.map((voice) => voice.id) as [string, ...string[]]),
    lengthPreset: z.enum(
      Object.keys(lengthPresets) as [keyof typeof lengthPresets, ...Array<keyof typeof lengthPresets>]
    ),
    tempoBpm: z.number().int().min(60).max(190),
    energy: z.number().int().min(0).max(100),
    clean: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (value.mode === "prompt" && !value.prompt) {
      context.addIssue({
        code: "custom",
        path: ["prompt"],
        message: "Describe the song you want to generate.",
      });
    }

    if (value.mode === "lyrics" && !value.lyrics) {
      context.addIssue({
        code: "custom",
        path: ["lyrics"],
        message: "Paste lyrics before generating from lyrics.",
      });
    }
  });

export const songPlanSchema = z.object({
  title: z.string().min(1).max(90),
  generatedLyrics: z.string().min(1).max(6000),
  vocalDirection: z.string().min(1).max(80),
  sections: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        lyric: z.string().min(1).max(1200),
        direction: z.string().min(1).max(60),
      })
    )
    .min(1),
  ttsSegments: z
    .array(
      z.object({
        section: z.string().min(1).max(40),
        direction: z.string().min(1).max(60),
        text: z.string().min(1).max(220),
      })
    )
    .min(1),
});

export const queuePayloadSchema = z.object({
  songId: z.string().min(1),
  userId: z.string().min(1),
});

export type CreateSongInput = z.infer<typeof createSongSchema>;
export type SongProductionPlan = z.infer<typeof songPlanSchema>;
export type SongQueuePayload = z.infer<typeof queuePayloadSchema>;
