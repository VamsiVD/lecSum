"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type UploadState = "idle" | "uploading" | "done" | "error";

export default function Home() {
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();

  const upload = useCallback(async (file: File) => {
    if (!file) return;

    const allowed = ["audio/mpeg", "audio/wav", "audio/x-m4a", "audio/flac", "audio/mp4"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|flac)$/i)) {
      setError("Please upload an MP3, WAV, M4A, or FLAC file.");
      return;
    }

    setState("uploading");
    setProgress(0);
    setError("");

    try {
      // 1. Get presigned URL from our API route
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!res.ok) throw new Error("Failed to get upload URL");
      const { url, key } = await res.json();

      // 2. Upload directly to S3
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error("Upload failed")));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setState("done");
      // Redirect to processing page after short delay
      setTimeout(() => router.push(`/processing?key=${encodeURIComponent(key)}`), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }, [router]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Lecsum
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Upload a lecture. Get a summary, quiz, and flashcards.
          </p>
        </div>

        {/* Upload zone */}
        <label
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`
            flex flex-col items-center justify-center w-full h-52 rounded-2xl border-2 border-dashed
            cursor-pointer transition-colors
            ${isDragging
              ? "border-violet-400 bg-violet-50 dark:bg-violet-950/20"
              : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600"
            }
            ${state === "uploading" ? "pointer-events-none" : ""}
          `}
        >
          <input
            type="file"
            className="hidden"
            accept=".mp3,.wav,.m4a,.flac"
            onChange={onFileChange}
            disabled={state === "uploading"}
          />

          {state === "idle" || state === "error" ? (
            <>
              <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 12V4M9 4L6 7M9 4L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"/>
                  <path d="M3 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-zinc-500"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Drop your lecture here
              </p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                MP3, WAV, M4A, FLAC
              </p>
            </>
          ) : state === "uploading" ? (
            <>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                Uploading…
              </p>
              <div className="w-48 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-400">{progress}%</p>
            </>
          ) : state === "done" ? (
            <>
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9l4 4 6-7" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Uploaded — redirecting…
              </p>
            </>
          ) : null}
        </label>

        {/* Error message */}
        {error && (
          <p className="mt-3 text-xs text-red-500 text-center">{error}</p>
        )}

        {/* Recent lectures placeholder */}
        <div className="mt-8">
          <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">
            Recent lectures
          </p>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="px-4 py-3 text-sm text-zinc-400 dark:text-zinc-500 text-center">
              No lectures yet
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}