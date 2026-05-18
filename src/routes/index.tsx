import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: EntryScreen,
});

function EntryScreen() {
  return (
    <main className="min-h-screen w-full bg-primary flex items-center justify-center px-6">
      <button className="min-h-16 rounded-2xl bg-foreground px-10 text-2xl font-display font-bold text-background shadow-glow">
        GİRİŞ YAP
      </button>
    </main>
  );
}
