"use client";

import { useState } from "react";
import { Job, Course, timeAgo, cleanName } from "./types";
import { RenameInput } from "./Renameinput";

const statusStyle: Record<string, string> = {
  done: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  transcribing: "text-blue-400 bg-blue-400/10 border-blue-400/25",
  extracting: "text-blue-400 bg-blue-400/10 border-blue-400/25",
  error: "text-red-400 bg-red-400/10 border-red-400/25",
  uploaded: "text-amber-400 bg-amber-400/10 border-amber-400/25",
};

const statusLabel: Record<string, string> = {
  done: "Ready", transcribing: "Processing", extracting: "Extracting",
  uploading: "Uploading",  // ← add
  error: "Failed", uploaded: "Queued", pending: "Pending",
};

const statusMessage: Record<string, string> = {
  uploading: "Uploading…",  // ← add
  extracting: "Extracting content…",
  uploaded: "Queued…",
  error: "Failed",
};

interface LectureCardProps {
  job: Job;
  courses: Course[];
  onClick: () => void;
  onDragStart: (key: string) => void;
  onRename: (key: string, name: string) => void;
  isDark: boolean;
}

export function LectureCard({ job, courses, onClick, onDragStart, onRename, isDark }: LectureCardProps) {
  const [renaming, setRenaming] = useState(false);
  const course = courses.find(c => c.id === job.course);
  const displayName = job.displayName ?? cleanName(job.fileName ?? job.uploadKey);

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(job.uploadKey); }}
      onClick={job.status === "done" ? onClick : undefined}
      className={`glass-card rounded-xl p-3.5 transition-all select-none group
        ${job.status === "done"
          ? "cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95 hover:-translate-y-0.5"
          : "opacity-60 cursor-grab"}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <RenameInput
              value={displayName}
              isDark={isDark}
              onSave={v => { onRename(job.uploadKey, v); setRenaming(false); }}
              onCancel={() => setRenaming(false)}
              className="text-sm w-full"
            />
          ) : (
            <p
              className={`text-sm font-medium truncate cursor-text ${isDark ? "text-white" : "text-gray-900"}`}
              onDoubleClick={e => { e.stopPropagation(); setRenaming(true); }}
              title="Double-click to rename"
            >{displayName}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            {course && (
              <span className={`flex items-center gap-1 text-[10px] ${isDark ? "text-white/50" : "text-gray-500"}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: course.color }} />
                {course.name}
              </span>
            )}
            <span className={`text-[10px] ${isDark ? "text-white/30" : "text-gray-400"}`}>{timeAgo(job.createdAt)}</span>
          </div>
        </div>
        <span className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${statusStyle[job.status] ?? "text-white/30 bg-white/5 border-white/10"}`}>
          {statusLabel[job.status] ?? job.status}
        </span>
      </div>

      {job.status === "done" && (
        <div className={`flex gap-1 pt-2 border-t ${isDark ? "border-white/8" : "border-black/8"}`}>
          {["Summary", "Quiz", "Flashcards"].map(t => (
            <span key={t} className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${isDark ? "text-white/35 bg-white/5 border-white/10" : "text-gray-400 bg-black/4 border-black/8"}`}>{t}</span>
          ))}
        </div>
      )}

      {job.status !== "done" && job.status !== "error" && (
        <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${isDark ? "border-white/8" : "border-black/8"}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[10px] text-white/35 animate-pulse">
            {statusMessage[job.status] ?? "Processing…"}
          </span>
        </div>
      )}
    </div>
  );
}