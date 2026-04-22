import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Music2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SongStudio } from "@/components/song-studio";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md border border-border bg-secondary">
              <Music2 className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-normal sm:text-lg">
                AI Song Generator
              </h1>
              <p className="text-xs text-muted-foreground">
                Groq Orpheus vocal MP3 studio
              </p>
            </div>
          </div>
          {userId ? (
            <UserButton />
          ) : (
            <div className="flex items-center gap-2">
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">
                  <Sparkles className="size-4" aria-hidden="true" />
                  Start
                </Button>
              </SignUpButton>
            </div>
          )}
        </div>
      </header>
      {userId ? (
        <SongStudio />
      ) : (
        <section className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl place-items-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-xl border border-border bg-card p-6 shadow-2xl shadow-black/20 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">
                  AI Song Generator
                </h2>
                <p className="text-sm text-muted-foreground">
                  Sign in to open the vocal studio.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <SignInButton mode="modal">
                <Button className="w-full">Sign in</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="w-full" variant="outline">
                  Create account
                </Button>
              </SignUpButton>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
