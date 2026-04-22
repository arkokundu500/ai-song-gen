import { MAX_TTS_INPUT_CHARS } from "@/lib/song-config";

const sentenceBreak = /(?<=[.!?])\s+|\n+/g;

export function segmentTextForTts(text: string, maxChars = MAX_TTS_INPUT_CHARS) {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .split(sentenceBreak)
    .map((part) => part.trim())
    .filter(Boolean);

  const segments: string[] = [];
  let current = "";

  for (const part of normalized.length ? normalized : [text.trim()]) {
    if (part.length > maxChars) {
      if (current) {
        segments.push(current);
        current = "";
      }

      segments.push(...splitLongPart(part, maxChars));
      continue;
    }

    const candidate = current ? `${current} ${part}` : part;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) {
        segments.push(current);
      }
      current = part;
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}

export function normalizeTtsSegments(
  segments: Array<{ section: string; direction: string; text: string }>,
  fallbackText: string,
  maxSegments: number
) {
  const sourceSegments = segments.length
    ? segments
    : segmentTextForTts(fallbackText).map((text) => ({
        section: "Song",
        direction: "expressive",
        text,
      }));

  const normalized = sourceSegments.flatMap((segment) =>
    segmentTextForTts(segment.text).map((text) => ({
      section: segment.section,
      direction: normalizeDirection(segment.direction),
      text,
    }))
  );

  return normalized.slice(0, maxSegments);
}

export function normalizeDirection(direction: string) {
  return direction
    .replace(/[[\]]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ")
    .toLowerCase();
}

function splitLongPart(part: string, maxChars: number) {
  const words = part.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(word.slice(0, maxChars));
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      chunks.push(current);
      current = word;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
