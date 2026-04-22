import Groq from "groq-sdk";
import {
  GROQ_PLANNER_MODEL,
  lengthPresets,
  MAX_TTS_INPUT_CHARS,
  ORPHEUS_TTS_MODEL,
  type LengthPreset,
} from "@/lib/song-config";
import { requireEnv } from "@/lib/env";
import {
  type CreateSongInput,
  type SongProductionPlan,
  songPlanSchema,
} from "@/lib/song-validation";

let groqClient: Groq | null = null;

function getGroq() {
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: requireEnv("GROQ_API_KEY"),
    });
  }

  return groqClient;
}

export async function createSongProductionPlan(input: CreateSongInput) {
  const maxSegments = lengthPresets[input.lengthPreset as LengthPreset].maxSegments;
  const response = await getGroq().chat.completions.create({
    model: GROQ_PLANNER_MODEL,
    temperature: 0.85,
    messages: [
      {
        role: "system",
        content:
          "You are a professional vocal producer and songwriter. Create concise singable lyrics and Orpheus TTS performance segments for a vocal-only MP3 demo. Do not imply instruments will be generated. Keep vocal directions to one or two words.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task:
            input.mode === "lyrics"
              ? "Create a vocal performance plan. Preserve the user's lyrics; only add section labels, title, and vocal direction ideas."
              : "Write a concise original vocal song demo from the prompt.",
          prompt: input.prompt ?? "",
          lyrics: input.lyrics ?? "",
          parameters: {
            genre: input.genre,
            mood: input.mood,
            voice: input.voice,
            targetLength: lengthPresets[input.lengthPreset as LengthPreset].label,
            tempoBpm: input.tempoBpm,
            energy: input.energy,
            clean: input.clean,
            maxTtsSegments: maxSegments,
            maxTtsInputCharacters: MAX_TTS_INPUT_CHARS,
          },
        }),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "song_production_plan",
        strict: true,
        schema: buildSongPlanJsonSchema(maxSegments),
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq planner returned an empty response.");
  }

  return songPlanSchema.parse(JSON.parse(content));
}

export async function synthesizeVocalSegment({
  text,
  direction,
  voice,
}: {
  text: string;
  direction: string;
  voice: string;
}) {
  const input = `[${direction}] ${text}`.slice(0, 200);
  const response = await getGroq().audio.speech.create({
    model: ORPHEUS_TTS_MODEL,
    voice,
    input,
    response_format: "wav",
    sample_rate: 44100,
    speed: 1,
  });

  return Buffer.from(await response.arrayBuffer());
}

function buildSongPlanJsonSchema(maxSegments: number) {
  return {
    type: "object",
    properties: {
      title: { type: "string", minLength: 1, maxLength: 90 },
      generatedLyrics: { type: "string", minLength: 1, maxLength: 6000 },
      vocalDirection: { type: "string", minLength: 1, maxLength: 80 },
      sections: {
        type: "array",
        minItems: 1,
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            label: { type: "string", minLength: 1, maxLength: 40 },
            lyric: { type: "string", minLength: 1, maxLength: 1200 },
            direction: { type: "string", minLength: 1, maxLength: 60 },
          },
          required: ["label", "lyric", "direction"],
          additionalProperties: false,
        },
      },
      ttsSegments: {
        type: "array",
        minItems: 1,
        maxItems: maxSegments,
        items: {
          type: "object",
          properties: {
            section: { type: "string", minLength: 1, maxLength: 40 },
            direction: { type: "string", minLength: 1, maxLength: 60 },
            text: { type: "string", minLength: 1, maxLength: 220 },
          },
          required: ["section", "direction", "text"],
          additionalProperties: false,
        },
      },
    },
    required: ["title", "generatedLyrics", "vocalDirection", "sections", "ttsSegments"],
    additionalProperties: false,
  };
}

export function buildLyricsModePlan(
  plan: SongProductionPlan,
  lyrics: string,
  maxSegments: number
) {
  return {
    ...plan,
    generatedLyrics: lyrics,
    ttsSegments: plan.ttsSegments.slice(0, maxSegments),
  };
}
