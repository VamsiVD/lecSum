"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Status = "loading" | "done" | "error";

function StudyContent() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";

  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!key) {
      setError("No lecture key provided.");
      setStatus("error");
      return;
    }

    fetch(`/api/transcript?key=${encodeURIComponent(key)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.text();
      })
      .then((text) => {
        setTranscript(text);
        setStatus("done");
      })
      .catch((err) => {
        setError(err.message);
        setStatus("error");
      });
  }, [key]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Transcript
            </h1>
            <p className="text-sm text-zinc-400 mt-0.5 font-mono truncate max-w-xs">
              {key}
            </p>
          </div>
          <a
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            ← Back
          </a>
        </div>

        {/* Content */}
        {status === "loading" && (
          <div className="flex items-center justify-center h-48 text-sm text-zinc-400">
            Loading transcript…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {status === "done" && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-5">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {transcript.split(" ").length.toLocaleString()} words
            </p>
            <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
              {transcript}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense>
      <StudyContent />
    </Suspense>
  );
}