# AI Song Generator

Production MVP for a Groq-powered vocal song generator. The app uses Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Clerk auth, Prisma/Postgres, Vercel Blob, Vercel Queues, and Sentry.

## What It Builds

- A signed-in vocal studio with prompt and lyrics modes.
- Genre, mood, voice, length, tempo, energy, and clean lyric controls.
- Groq structured-output planning with `openai/gpt-oss-120b`.
- Groq Orpheus vocal synthesis with `canopylabs/orpheus-v1-english`.
- WAV segment stitching and MP3 export through `ffmpeg-static`.
- Saved user song library with private Blob-backed audio streaming.

This MVP creates vocal-only MP3 demos. It does not generate instrumental backing tracks.

## Setup

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Required services:

- Clerk for auth
- Postgres database for Prisma
- Vercel Blob store for private MP3 storage
- Vercel Queues for background generation
- Groq API key for planning and Orpheus TTS
- Sentry project for monitoring

For local Vercel Queues, run `vercel link` and `vercel env pull`, or provide `VERCEL_QUEUE_API_TOKEN`.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The local app runs at [http://localhost:3000](http://localhost:3000).
