"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Status = "pending" | "transcribing" | "done" | "error";

function ProcessingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const uploadKey = params.get("key") ?? "";

  const [status, setStatus] = useState<Status>("pending");
  const [elapsed, setElapsed] = useState(0);
  const [transcriptKey, setTranscriptKey] = useState("");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!uploadKey) return;
    if (status === "done" || status === "error") return;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/job-status?uploadKey=${encodeURIComponent(uploadKey)}`
        );
        if (!res.ok) return;
        const data = await res.json();

        setStatus(data.status ?? "pending");
        if (data.transcriptKey) setTranscriptKey(data.transcriptKey);
        if (data.fileName) setFileName(data.fileName);
      } catch {
        // network blip — keep polling
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [uploadKey, status]);

  useEffect(() => {
    if (status === "done" && transcriptKey) {
      setTimeout(() => {
        router.push(`/study?key=${encodeURIComponent(transcriptKey)}`);
      }, 1200);
    }
  }, [status, transcriptKey, router]);

  const steps = [
    { id: "upload",     label: "Uploaded to S3",       active: false,                                          done: true },
    { id: "transcribe", label: "Transcribing audio",    active: status === "transcribing" || status === "pending", done: status === "done" },
    { id: "parse",      label: "Extracting transcript", active: false,                                          done: status === "done" },
    { id: "ready",      label: "Ready to study",        active: false,                                          done: status === "done" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {status === "done" ? "Ready to study" : "Processing your lecture"}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {fileName || uploadKey} · {elapsed}s
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? "bg-green-100 dark:bg-green-900/30" : step.active ? "bg-violet-100 dark:bg-violet-900/30" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                {step.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {step.active && !step.done && <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />}
                {!step.done && !step.active && <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />}
              </div>
              <span className={`text-sm ${step.done ? "text-zinc-700 dark:text-zinc-300" : step.active ? "text-zinc-900 dark:text-zinc-100 font-weight-medium" : "text-zinc-400 dark:text-zinc-500"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-violet-500 rounded-full transition-all duration-700" style={{ width: status === "done" ? "100%" : status === "transcribing" ? "50%" : "15%" }} />
        </div>

        {status === "error" && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400 mb-4">
            Something went wrong. <a href="/" className="underline">Try again</a>
          </div>
        )}

        {status === "done" && transcriptKey && (
          <a href={`/study?key=${encodeURIComponent(transcriptKey)}`} className="flex items-center justify-center w-full h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors">
            View transcript
          </a>
        )}

        {status !== "done" && status !== "error" && (
          <p className="text-xs text-zinc-400 text-center">
            Transcription takes 1–3 minutes. You can close this tab and come back.
          </p>
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