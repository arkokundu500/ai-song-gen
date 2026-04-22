import { getQueueClient } from "@/lib/queue";
import { processSongGeneration } from "@/lib/song-generation";
import { queuePayloadSchema } from "@/lib/song-validation";

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = getQueueClient().handleCallback(
  async (message) => {
    const payload = queuePayloadSchema.parse(message);
    await processSongGeneration(payload.songId, payload.userId);
  },
  {
    visibilityTimeoutSeconds: 600,
    retry: (_error, metadata) => {
      if (metadata.deliveryCount >= 3) {
        return { acknowledge: true };
      }

      return { afterSeconds: Math.min(300, 10 * 2 ** metadata.deliveryCount) };
    },
  }
);
