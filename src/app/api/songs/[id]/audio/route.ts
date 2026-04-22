import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const song = await getPrisma().song.findFirst({
    where: { id, userId },
  });

  if (!song?.blobPathname) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  const result = await get(song.blobPathname, {
    access: "private",
    useCache: false,
  });

  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const headers = new Headers({
    "Content-Type": "audio/mpeg",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-cache",
  });

  if (url.searchParams.get("download") === "1") {
    headers.set(
      "Content-Disposition",
      `attachment; filename="${safeFilename(song.title ?? "ai-song")}.mp3"`
    );
  }

  return new Response(result.stream, { headers });
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "ai-song";
}
