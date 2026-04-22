"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  Music2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  genres,
  isTerminalStatus,
  lengthPresets,
  moods,
  statusProgress,
  voices,
  type LengthPreset,
  type SongMode,
  type SongStatus,
} from "@/lib/song-config";
import { cn } from "@/lib/utils";

type SongItem = {
  id: string;
  title: string;
  status: SongStatus;
  mode: SongMode;
  genre: string;
  mood: string;
  voice: string;
  lengthPreset: string;
  tempoBpm: number;
  energy: number;
  clean: boolean;
  generatedLyrics: string | null;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  progress: number;
  audioUrl: string | null;
  downloadUrl: string | null;
};

const statusLabels: Record<SongStatus, string> = {
  queued: "Queued",
  planning: "Planning",
  synthesizing: "Synthesizing",
  mixing: "Mixing",
  completed: "Completed",
  failed: "Failed",
};

export function SongStudio() {
  const [mode, setMode] = useState<SongMode>("prompt");
  const [prompt, setPrompt] = useState(
    "A confident pop anthem about rebuilding yourself after a long night, with a hook that feels cinematic and memorable."
  );
  const [lyrics, setLyrics] = useState("");
  const [genre, setGenre] = useState<(typeof genres)[number]>("Pop");
  const [mood, setMood] = useState<(typeof moods)[number]>("uplifting");
  const [voice, setVoice] = useState<(typeof voices)[number]["id"]>("troy");
  const [lengthPreset, setLengthPreset] = useState<LengthPreset>("short");
  const [tempoBpm, setTempoBpm] = useState(112);
  const [energy, setEnergy] = useState(74);
  const [clean, setClean] = useState(true);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);

  const selectedSong = useMemo(
    () => songs.find((song) => song.id === selectedSongId) ?? songs[0] ?? null,
    [selectedSongId, songs]
  );

  const activeJobs = useMemo(
    () => songs.filter((song) => !isTerminalStatus(song.status)),
    [songs]
  );

  const loadSongs = useCallback(async () => {
    const response = await fetch("/api/songs", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load songs.");
    }

    const data = (await response.json()) as { songs: SongItem[] };
    setSongs(data.songs);
    setSelectedSongId((current) => current ?? data.songs[0]?.id ?? null);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadSongs()
        .catch((error) => toast.error(error.message))
        .finally(() => setIsLoadingSongs(false));
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadSongs]);

  useEffect(() => {
    if (!activeJobs.length) {
      return;
    }

    const interval = window.setInterval(() => {
      loadSongs().catch(() => undefined);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [activeJobs.length, loadSongs]);

  async function handleGenerate() {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt,
          lyrics,
          genre,
          mood,
          voice,
          lengthPreset,
          tempoBpm,
          energy,
          clean,
        }),
      });

      const data = (await response.json()) as {
        song?: SongItem;
        error?: string;
        warning?: string;
      };

      if (!response.ok || !data.song) {
        throw new Error(data.error ?? "Unable to create song.");
      }

      setSongs((current) => [
        data.song!,
        ...current.filter((song) => song.id !== data.song!.id),
      ]);
      setSelectedSongId(data.song.id);

      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success("Song queued");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to generate song.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDelete(songId: string) {
    const response = await fetch(`/api/songs/${songId}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Unable to delete song.");
      return;
    }

    setSongs((current) => current.filter((song) => song.id !== songId));
    setSelectedSongId((current) => (current === songId ? null : current));
    toast.success("Song deleted");
  }

  async function handleRetry(songId: string) {
    const response = await fetch(`/api/songs/${songId}/retry`, { method: "POST" });
    const data = (await response.json().catch(() => null)) as { song?: SongItem } | null;

    if (!response.ok || !data?.song) {
      toast.error("Unable to retry song.");
      return;
    }

    setSongs((current) => [data.song!, ...current.filter((song) => song.id !== songId)]);
    setSelectedSongId(songId);
    toast.success("Retry queued");
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(360px,0.92fr)_minmax(0,1.08fr)]">
      <section className="border border-border bg-card/70">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Vocal Studio</h2>
            <p className="text-xs text-muted-foreground">Prompt, lyrics, style, voice</p>
          </div>
          <Badge variant="secondary">MP3</Badge>
        </div>

        <div className="space-y-5 p-4">
          <Tabs value={mode} onValueChange={(value) => setMode(value as SongMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
            </TabsList>
            <TabsContent value="prompt" className="mt-3">
              <Label htmlFor="song-prompt">Song prompt</Label>
              <Textarea
                id="song-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="mt-2 min-h-36 resize-none"
                maxLength={1200}
              />
              <div className="mt-1 text-right text-xs text-muted-foreground">
                {prompt.length}/1200
              </div>
            </TabsContent>
            <TabsContent value="lyrics" className="mt-3">
              <Label htmlFor="song-lyrics">Lyrics</Label>
              <Textarea
                id="song-lyrics"
                value={lyrics}
                onChange={(event) => setLyrics(event.target.value)}
                className="mt-2 min-h-44 resize-none"
                maxLength={5000}
              />
              <div className="mt-1 text-right text-xs text-muted-foreground">
                {lyrics.length}/5000
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldSelect label="Genre" value={genre} onValueChange={(value) => setGenre(value as typeof genre)}>
              {genres.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </FieldSelect>
            <FieldSelect label="Mood" value={mood} onValueChange={(value) => setMood(value as typeof mood)}>
              {moods.map((item) => (
                <SelectItem key={item} value={item}>
                  {capitalize(item)}
                </SelectItem>
              ))}
            </FieldSelect>
            <FieldSelect label="Voice" value={voice} onValueChange={(value) => setVoice(value as typeof voice)}>
              {voices.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label} - {item.tone}
                </SelectItem>
              ))}
            </FieldSelect>
            <FieldSelect
              label="Length"
              value={lengthPreset}
              onValueChange={(value) => setLengthPreset(value as LengthPreset)}
            >
              {Object.entries(lengthPresets).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  {preset.label}
                </SelectItem>
              ))}
            </FieldSelect>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SliderField
              label="Tempo"
              value={tempoBpm}
              suffix=" BPM"
              min={60}
              max={190}
              onChange={setTempoBpm}
            />
            <SliderField
              label="Energy"
              value={energy}
              suffix="%"
              min={0}
              max={100}
              onChange={setEnergy}
            />
          </div>

          <div className="flex items-center justify-between border border-border bg-background/50 px-3 py-3">
            <div>
              <Label htmlFor="clean-mode">Clean lyrics</Label>
              <p className="text-xs text-muted-foreground">Keep output radio-friendly</p>
            </div>
            <Switch id="clean-mode" checked={clean} onCheckedChange={setClean} />
          </div>

          <Button
            className="h-11 w-full"
            onClick={handleGenerate}
            disabled={
              isGenerating ||
              (mode === "prompt" && !prompt.trim()) ||
              (mode === "lyrics" && !lyrics.trim())
            }
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Wand2 className="size-4" aria-hidden="true" />
            )}
            Generate vocal MP3
          </Button>
        </div>
      </section>

      <section className="grid min-h-[720px] gap-5 lg:grid-rows-[auto_minmax(0,1fr)]">
        <div className="border border-border bg-card/70">
          <div className="flex flex-col gap-4 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold tracking-normal">
                  {selectedSong?.title ?? "No song selected"}
                </h2>
                {selectedSong ? <StatusBadge status={selectedSong.status} /> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedSong
                  ? `${selectedSong.genre} - ${selectedSong.mood} - ${selectedSong.tempoBpm} BPM`
                  : "Your latest vocal render appears here."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {selectedSong?.status === "failed" ? (
                <Button variant="outline" onClick={() => handleRetry(selectedSong.id)}>
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Retry
                </Button>
              ) : null}
              {selectedSong?.downloadUrl ? (
                <Button asChild>
                  <a href={selectedSong.downloadUrl}>
                    <Download className="size-4" aria-hidden="true" />
                    MP3
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-5 p-4">
            <Waveform active={Boolean(selectedSong && !isTerminalStatus(selectedSong.status))} />

            {selectedSong ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{statusLabels[selectedSong.status]}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {selectedSong.progress ?? statusProgress(selectedSong.status)}%
                  </span>
                </div>
                <Progress value={selectedSong.progress ?? statusProgress(selectedSong.status)} />
              </div>
            ) : null}

            {selectedSong?.audioUrl ? (
              <audio className="w-full" controls src={selectedSong.audioUrl} />
            ) : (
              <div className="flex min-h-14 items-center justify-center border border-dashed border-border text-sm text-muted-foreground">
                {selectedSong?.status === "failed"
                  ? selectedSong.errorMessage ?? "Generation failed"
                  : "Audio player will appear after mixdown"}
              </div>
            )}

            {selectedSong?.generatedLyrics ? (
              <div className="border border-border bg-background/45">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-medium">
                  <Music2 className="size-4 text-primary" aria-hidden="true" />
                  Lyrics
                </div>
                <ScrollArea className="h-40">
                  <pre className="whitespace-pre-wrap p-3 font-sans text-sm leading-6 text-muted-foreground">
                    {selectedSong.generatedLyrics}
                  </pre>
                </ScrollArea>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 border border-border bg-card/70">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Library</h2>
              <p className="text-xs text-muted-foreground">Saved vocal generations</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => loadSongs().catch(() => undefined)}>
              <RefreshCw className="size-4" aria-hidden="true" />
              <span className="sr-only">Refresh library</span>
            </Button>
          </div>
          <ScrollArea className="h-[360px]">
            <div className="divide-y divide-border">
              {isLoadingSongs ? (
                <div className="p-4 text-sm text-muted-foreground">Loading library...</div>
              ) : songs.length ? (
                songs.map((song) => (
                  <div
                    key={song.id}
                    className={cn(
                      "grid grid-cols-[1fr_auto] gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                      selectedSong?.id === song.id && "bg-muted/55"
                    )}
                  >
                    <button
                      className="min-w-0 text-left"
                      onClick={() => setSelectedSongId(song.id)}
                      type="button"
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{song.title}</span>
                        <StatusBadge status={song.status} />
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {song.genre} - {song.voice} - {formatDate(song.createdAt)}
                      </span>
                    </button>
                    <span className="flex items-center gap-1">
                      {song.status === "failed" ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRetry(song.id)}
                        >
                          <RotateCcw className="size-4" aria-hidden="true" />
                          <span className="sr-only">Retry</span>
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(song.id)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </span>
                  </div>
                ))
              ) : (
                <div className="grid h-52 place-items-center p-4 text-center text-sm text-muted-foreground">
                  <div>
                    <Sparkles className="mx-auto mb-3 size-6 text-primary" aria-hidden="true" />
                    <p>No saved songs yet.</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </section>
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

function SliderField({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3 border border-border bg-background/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="font-mono text-xs text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([next]) => {
          if (typeof next === "number") {
            onChange(next);
          }
        }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: SongStatus }) {
  return (
    <Badge
      variant={status === "failed" ? "destructive" : status === "completed" ? "default" : "secondary"}
      className="shrink-0"
    >
      {statusLabels[status]}
    </Badge>
  );
}

function Waveform({ active }: { active: boolean }) {
  const bars = [34, 58, 82, 46, 70, 36, 92, 54, 76, 44, 64, 88, 52, 72, 40, 62, 80, 50];

  return (
    <div className="flex h-40 items-center gap-1 border border-border bg-background/50 px-4">
      {bars.map((height, index) => (
        <div
          key={`${height}-${index}`}
          className={cn(
            "w-full rounded-sm bg-primary/75 transition-all",
            index % 3 === 1 && "bg-accent/80",
            index % 4 === 2 && "bg-chart-3/80",
            active && "animate-pulse"
          )}
          style={{
            height: `${height}%`,
            animationDelay: `${index * 75}ms`,
          }}
        />
      ))}
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
