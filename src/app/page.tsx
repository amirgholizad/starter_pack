import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Next.js + Tailwind + shadcn
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          A minimal starter. Edit{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            src/app/page.tsx
          </code>{" "}
          to get going.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <a href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer">
            Next.js docs
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="https://ui.shadcn.com" target="_blank" rel="noopener noreferrer">
            shadcn/ui
          </a>
        </Button>
      </div>
    </div>
  );
}
