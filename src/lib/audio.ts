import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { nanoid } from "nanoid";

export async function encodeSegmentsToMp3({
  songId,
  segments,
}: {
  songId: string;
  segments: Buffer[];
}) {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not provide an executable path.");
  }

  if (!segments.length) {
    throw new Error("Cannot encode an empty audio segment list.");
  }

  const workDir = path.join(tmpdir(), `songgen-${songId}-${nanoid(8)}`);
  await mkdir(workDir, { recursive: true });

  try {
    const segmentPaths: string[] = [];

    for (const [index, segment] of segments.entries()) {
      const segmentPath = path.join(workDir, `segment-${index}.wav`);
      await writeFile(segmentPath, segment);
      segmentPaths.push(segmentPath);
    }

    const concatListPath = path.join(workDir, "concat.txt");
    await writeFile(
      concatListPath,
      segmentPaths
        .map((segmentPath) => `file '${segmentPath.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
        .join("\n")
    );

    const outputPath = path.join(workDir, "song.mp3");
    await runFfmpeg([
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatListPath,
      "-vn",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-b:a",
      "192k",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export function estimateDurationSeconds(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(8, Math.round((words / 145) * 60));
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath as string, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    const stderr: Buffer[] = [];

    child.stderr.on("data", (chunk: Buffer) => {
      stderr.push(chunk);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `ffmpeg exited with code ${code}: ${Buffer.concat(stderr).toString("utf8")}`
        )
      );
    });
  });
}
