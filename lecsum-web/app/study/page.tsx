"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function StudyContent() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";

  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!key) {
      setError("No lecture selected.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/transcript?key=${encodeURIComponent(key)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Could not load transcript.");
          return;
        }
        if (typeof data.text === "string") setText(data.text);
        else setError("Invalid response from server.");
      } catch {
        if (!cancelled) setError("Network error.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Transcript
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-mono break-all">{key || "—"}</p>
          </div>
          <Link
            href="/"
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline shrink-0"
          >
            Upload another
          </Link>
        </div>

        {!key && (
          <p className="text-sm text-zinc-500">Open this page from the processing screen after upload.</p>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {key && !error && text === null && (
          <p className="text-sm text-zinc-500">Loading transcript…</p>
        )}

        {text !== null && !error && (
          <article className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
            <pre className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200 font-sans leading-relaxed">
              {text}
            </pre>
          </article>
        )}
      </div>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <StudyContent />
    </Suspense>
  );
}
