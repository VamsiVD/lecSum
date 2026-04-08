"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const AUDIO_FORMATS = new Set(["mp3", "wav", "m4a", "flac", "ogg", "webm", "amr"]);
const DOC_FORMATS = new Set(["pdf", "jpg", "jpeg", "png", "tiff", "tif"]);

function getFileType(key: string): "audio" | "document" | "unknown" {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  if (AUDIO_FORMATS.has(ext)) return "audio";
  if (DOC_FORMATS.has(ext)) return "document";
  return "unknown";
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
  );
}

function StepRow({ label, state }: { label: string; state: "waiting" | "active" | "done" | "error" }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 flex justify-center">
        {state === "done" && <span className="text-emerald-500 text-sm">✓</span>}
        {state === "active" && <Spinner />}
        {state === "waiting" && <span className="w-2 h-2 rounded-full bg-gray-200 mx-auto block" />}
        {state === "error" && <span className="text-red-500 text-sm">✕</span>}
      </div>
      <span className={`text-sm ${
        state === "done" ? "text-gray-500 line-through" :
        state === "active" ? "text-gray-900 font-medium" :
        state === "error" ? "text-red-600" :
        "text-gray-400"
      }`}>{label}</span>
    </div>
  );
}

export default function ProcessingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uploadKey = searchParams.get("key") ?? "";
  const fileType = getFileType(uploadKey);

  const [step, setStep] = useState<"uploading" | "extracting" | "done" | "error">("uploading");
  const [errorMsg, setErrorMsg] = useState("");
  const extractCalled = useRef(false);

  // For documents: call /api/extract then poll for done
  // For audio: just poll DynamoDB (Transcribe handles it async)
  useEffect(() => {
    if (!uploadKey) return;

    if (fileType === "document" && !extractCalled.current) {
      extractCalled.current = true;
      setStep("extracting");

      fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadKey }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Extraction failed");
          setStep("done");
          setTimeout(() => {
            router.push(`/study?key=${encodeURIComponent(data.transcriptKey)}`);
          }, 1000);
        })
        .catch((err) => {
          setStep("error");
          setErrorMsg(err.message);
        });

      return;
    }

    if (fileType === "audio") {
      setStep("extracting");
      const poll = async () => {
        try {
          const res = await fetch(`/api/job-status?uploadKey=${encodeURIComponent(uploadKey)}`);
          const data = await res.json();
          if (data.status === "done") {
            setStep("done");
            setTimeout(() => {
              router.push(`/study?key=${encodeURIComponent(data.transcriptKey)}`);
            }, 1000);
          } else if (data.status === "error") {
            setStep("error");
            setErrorMsg("Transcription failed. Please try again.");
          }
        } catch {
          // keep polling
        }
      };

      poll();
      const interval = setInterval(poll, 4000);
      return () => clearInterval(interval);
    }
  }, [uploadKey, fileType, router]);

  const audioSteps = [
    { label: "Uploading to S3", state: step === "uploading" ? "active" : "done" },
    { label: "Transcribing audio", state: step === "uploading" ? "waiting" : step === "extracting" ? "active" : step === "done" ? "done" : "error" },
    { label: "Ready to study", state: step === "done" ? "done" : "waiting" },
  ];

  const docSteps = [
    { label: "Uploading to S3", state: step === "uploading" ? "active" : "done" },
    { label: "Extracting content with Claude vision", state: step === "uploading" ? "waiting" : step === "extracting" ? "active" : step === "done" ? "done" : "error" },
    { label: "Ready to study", state: step === "done" ? "done" : "waiting" },
  ];

  const steps = fileType === "audio" ? audioSteps : docSteps;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 w-full max-w-sm">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-900">Processing your file</h1>
          <p className="text-sm text-gray-500 mt-1 truncate">{uploadKey.split("-").slice(2).join("-")}</p>
        </div>

        <div className="space-y-4 mb-6">
          {steps.map((s) => (
            <StepRow key={s.label} label={s.label} state={s.state as "waiting" | "active" | "done" | "error"} />
          ))}
        </div>

        {step === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {errorMsg || "Something went wrong."}
          </div>
        )}

        {step === "extracting" && fileType === "audio" && (
          <p className="text-xs text-gray-400 text-center">Audio transcription takes 1–3 minutes</p>
        )}

        {step === "extracting" && fileType === "document" && (
          <p className="text-xs text-gray-400 text-center">Vision extraction usually takes 10–30 seconds</p>
        )}
      </div>
    </div>
  );
}