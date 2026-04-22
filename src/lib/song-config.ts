export const GROQ_PLANNER_MODEL = "openai/gpt-oss-120b";
export const ORPHEUS_TTS_MODEL = "canopylabs/orpheus-v1-english";
export const SONG_QUEUE_TOPIC = "song-generation";
export const MAX_TTS_INPUT_CHARS = 180;

export const songModes = ["prompt", "lyrics"] as const;
export const songStatuses = [
  "queued",
  "planning",
  "synthesizing",
  "mixing",
  "completed",
  "failed",
] as const;

export const voices = [
  { id: "autumn", label: "Autumn", tone: "airy female" },
  { id: "diana", label: "Diana", tone: "clear female" },
  { id: "hannah", label: "Hannah", tone: "warm female" },
  { id: "austin", label: "Austin", tone: "bright male" },
  { id: "daniel", label: "Daniel", tone: "rounded male" },
  { id: "troy", label: "Troy", tone: "confident male" },
] as const;

export const genres = [
  "Pop",
  "R&B",
  "Hip-Hop",
  "Indie",
  "Country",
  "EDM",
  "Rock",
  "Folk",
  "Cinematic",
  "Afrobeats",
] as const;

export const moods = [
  "uplifting",
  "melancholic",
  "romantic",
  "confident",
  "dreamy",
  "dramatic",
  "playful",
  "introspective",
] as const;

export const lengthPresets = {
  short: {
    label: "30-45s demo",
    targetSeconds: 40,
    maxSegments: 8,
    description: "Fast hook-ready preview",
  },
  standard: {
    label: "60-90s cut",
    targetSeconds: 75,
    maxSegments: 18,
    description: "Verse plus chorus",
  },
  full: {
    label: "120-180s full vocal",
    targetSeconds: 150,
    maxSegments: 36,
    description: "Queue-backed extended version",
  },
} as const;

export type SongMode = (typeof songModes)[number];
export type SongStatus = (typeof songStatuses)[number];
export type VoiceId = (typeof voices)[number]["id"];
export type Genre = (typeof genres)[number];
export type Mood = (typeof moods)[number];
export type LengthPreset = keyof typeof lengthPresets;

export function isTerminalStatus(status: SongStatus) {
  return status === "completed" || status === "failed";
}

export function statusProgress(status: SongStatus) {
  switch (status) {
    case "queued":
      return 8;
    case "planning":
      return 24;
    case "synthesizing":
      return 62;
    case "mixing":
      return 84;
    case "completed":
      return 100;
    case "failed":
      return 100;
  }
}
