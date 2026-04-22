import { describe, expect, it } from "vitest";
import { MAX_TTS_INPUT_CHARS } from "@/lib/song-config";
import { normalizeDirection, normalizeTtsSegments, segmentTextForTts } from "@/lib/song-segmenter";

describe("segmentTextForTts", () => {
  it("keeps each segment within the Orpheus character budget", () => {
    const text = Array.from({ length: 90 }, (_, index) => `word${index}`).join(" ");
    const segments = segmentTextForTts(text);

    expect(segments.length).toBeGreaterThan(1);
    expect(segments.every((segment) => segment.length <= MAX_TTS_INPUT_CHARS)).toBe(true);
  });

  it("preserves lyric ordering when splitting", () => {
    const text = "first line sings. second line answers. third line resolves.";
    const segments = segmentTextForTts(text, 24);

    expect(segments.join(" ")).toBe(text);
  });
});

describe("normalizeTtsSegments", () => {
  it("splits oversized model segments and respects max segment count", () => {
    const normalized = normalizeTtsSegments(
      [
        {
          section: "Hook",
          direction: "[dramatic soaring vocal]",
          text: Array.from({ length: 70 }, (_, index) => `lyric${index}`).join(" "),
        },
      ],
      "",
      3
    );

    expect(normalized).toHaveLength(3);
    expect(normalized.every((segment) => segment.text.length <= MAX_TTS_INPUT_CHARS)).toBe(true);
    expect(normalized.every((segment) => segment.direction.split(" ").length <= 2)).toBe(true);
  });

  it("normalizes directions to one or two words", () => {
    expect(normalizeDirection("[warm cinematic whisper]")).toBe("warm cinematic");
  });
});
