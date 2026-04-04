"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Step = {
  id: string;
  label: string;
  status: "done" | "active" | "waiting";
};

function ProcessingContent() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";

  const [steps, setSteps] = useState<Step[]>([
    { id: "upload",     label: "Uploaded to S3",       status: "done" },
    { id: "transcribe", label: "Transcribing audio",    status: "active" },
    { id: "parse",      label: "Extracting transcript", status: "waiting" },
    { id: "summary",    label: "Generating summary",    status: "waiting" },
    { id: "quiz",       label: "Creating quiz",         status: "waiting" },
    { id: "flashcards", label: "Building flashcards",   status: "waiting" },
  ]);

  const [elapsed, setElapsed] = useState(0);

  // Tick elapsed time
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Simulate pipeline progress — replace with real polling once API exists
  useEffect(() => {
    const timings: Record<string, number> = {
      transcribe: 8000,
      parse:      10000,
      summary:    14000,
      quiz:       18000,
      flashcards: 22000,
    };

    const timers = Object.entries(timings).map(([id, delay]) =>
      setTimeout(() => {
        setSteps((prev) =>
          prev.map((s, i, arr) => {
            if (s.id === id) return { ...s, status: "done" };
            const next = arr[i - 1];
            if (next?.id === id) return { ...s, status: "active" };
            return s;
          })
        );
      }, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  const done = steps.every((s) => s.status === "done");
  const pct = Math.round((steps.filter((s) => s.status === "done").length / steps.length) * 100);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="mb-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {done ? "Ready to study" : "Processing your lecture"}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {done ? "Everything is ready." : `${elapsed}s elapsed`}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              <div className={`
                w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                ${step.status === "done"    ? "bg-green-100 dark:bg-green-900/30" : ""}
                ${step.status === "active"  ? "bg-violet-100 dark:bg-violet-900/30" : ""}
                ${step.status === "waiting" ? "bg-zinc-100 dark:bg-zinc-800" : ""}
              `}>
                {step.status === "done" && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {step.status === "active" && (
                  <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                )}
                {step.status === "waiting" && (
                  <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                )}
              </div>
              <span className={`text-sm ${
                step.status === "done"    ? "text-zinc-700 dark:text-zinc-300" :
                step.status === "active"  ? "text-zinc-900 dark:text-zinc-100 font-medium" :
                                            "text-zinc-400 dark:text-zinc-500"
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        {done && (
          <a
            href={`/study?key=${encodeURIComponent(key)}`}
            className="mt-6 flex items-center justify-center w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
          >
            View study materials
          </a>
        )}

      </div>
    </div>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense>
      <ProcessingContent />
    </Suspense>
  );
}