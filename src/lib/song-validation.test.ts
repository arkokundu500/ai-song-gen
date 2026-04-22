import { describe, expect, it } from "vitest";
import { createSongSchema } from "@/lib/song-validation";

const validBase = {
  genre: "Pop",
  mood: "uplifting",
  voice: "troy",
  lengthPreset: "short",
  tempoBpm: 112,
  energy: 74,
  clean: true,
};

describe("createSongSchema", () => {
  it("accepts a prompt generation request", () => {
    const result = createSongSchema.safeParse({
      ...validBase,
      mode: "prompt",
      prompt: "A bright chorus about starting over.",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a lyrics generation request", () => {
    const result = createSongSchema.safeParse({
      ...validBase,
      mode: "lyrics",
      lyrics: "We rise again\nWe find the morning",
    });

    expect(result.success).toBe(true);
  });

  it("rejects prompt mode without a prompt", () => {
    const result = createSongSchema.safeParse({
      ...validBase,
      mode: "prompt",
      prompt: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid voices and out-of-range controls", () => {
    const result = createSongSchema.safeParse({
      ...validBase,
      mode: "prompt",
      prompt: "A song.",
      voice: "unknown",
      tempoBpm: 240,
      energy: 120,
    });

    expect(result.success).toBe(false);
  });
});
