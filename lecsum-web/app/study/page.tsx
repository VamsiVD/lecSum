"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Tab = "transcript" | "summary";
type Status = "loading" | "done" | "error";

type Summary = {
  tldr: string;
  key_concepts: string[];
  summary: string;
  topics: string[];
};

function StudyContent() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";

  const [tab, setTab] = useState<Tab>("summary");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transcriptStatus, setTranscriptStatus] = useState<Status>("loading");
  const [summaryStatus, setSummaryStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!key) return;
    fetch(`/api/transcript?key=${encodeURIComponent(key)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.text(); })
      .then((t) => { setTranscript(t); setTranscriptStatus("done"); })
      .catch(() => setTranscriptStatus("error"));
  }, [key]);

  useEffect(() => {
    if (!key) return;
    fetch(`/api/summary?key=${encodeURIComponent(key)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setSummary(d); setSummaryStatus("done"); })
      .catch(() => setSummaryStatus("error"));
  }, [key]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "summary",    label: "Summary" },
    { id: "transcript", label: "Transcript" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-2xl mx-auto">

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Study materials</h1>
          <a href="/" className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">← Back</a>
        </div>

        <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-800 mb-6">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "summary" && (
          <>
            {summaryStatus === "loading" && (
              <div className="space-y-3">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-5/6" />
              </div>
            )}
            {summaryStatus === "error" && (
              <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                Could not generate summary.
              </div>
            )}
            {summaryStatus === "done" && summary && (
              <div className="space-y-5">
                <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 px-4 py-3">
                  <p className="text-xs font-medium text-violet-500 dark:text-violet-400 uppercase tracking-wider mb-1">tldr</p>
                  <p className="text-sm text-violet-900 dark:text-violet-100 leading-relaxed">{summary.tldr}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.topics.map((t) => (
                    <span key={t} className="text-xs px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">{t}</span>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Key concepts</p>
                  <div className="space-y-2">
                    {summary.key_concepts.map((c) => (
                      <div key={c} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{c}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Summary</p>
                  <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{summary.summary}</p>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "transcript" && (
          <>
            {transcriptStatus === "loading" && (
              <div className="space-y-3">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-5/6" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full" />
              </div>
            )}
            {transcriptStatus === "error" && (
              <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                Could not load transcript.
              </div>
            )}
            {transcriptStatus === "done" && (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-5">
                <p className="text-sm text-zinc-400 mb-4">{transcript.split(" ").filter(Boolean).length.toLocaleString()} words</p>
                <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{transcript}</p>
              </div>
            )}
          </>
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