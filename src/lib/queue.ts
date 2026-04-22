import { QueueClient } from "@vercel/queue";
import { optionalEnv } from "@/lib/env";
import { SONG_QUEUE_TOPIC } from "@/lib/song-config";
import type { SongQueuePayload } from "@/lib/song-validation";

let queueClient: QueueClient | null = null;

export function getQueueClient() {
  if (!queueClient) {
    queueClient = new QueueClient({
      region: optionalEnv("VERCEL_REGION") ?? "iad1",
      token: optionalEnv("VERCEL_QUEUE_API_TOKEN"),
    });
  }

  return queueClient;
}

export function enqueueSongGeneration(payload: SongQueuePayload) {
  return getQueueClient().send(SONG_QUEUE_TOPIC, payload, {
    idempotencyKey: `song-${payload.songId}`,
    retentionSeconds: 24 * 60 * 60,
  });
}
