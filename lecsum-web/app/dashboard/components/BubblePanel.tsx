"use client";

import { Course, Job, BubblePos, timeAgo, cleanName } from "./types";

interface BubblePanelProps {
  course: Course | null;
  jobs: Job[];
  pos: BubblePos | null;
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onClickLecture: (job: Job) => void;
}

const statusStyle: Record<string, string> = {
  done: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  transcribing: "text-blue-400 bg-blue-400/10 border-blue-400/25",
  extracting: "text-blue-400 bg-blue-400/10 border-blue-400/25",
  error: "text-red-400 bg-red-400/10 border-red-400/25",
  uploaded: "text-amber-400 bg-amber-400/10 border-amber-400/25",
};

const statusLabel: Record<string, string> = {
  done: "Ready", transcribing: "Processing", extracting: "Extracting",
  error: "Failed", uploaded: "Queued",
};

export function BubblePanel({ course, jobs, pos, isOpen, isClosing, onClose, onClickLecture }: BubblePanelProps) {
  if (!course || !pos) return null;
  const lectures = jobs.filter(j => j.course === course.id);

  return (
    <div className="absolute z-50 pointer-events-none" style={{ top: pos.top, left: pos.left }}>
      {/* Arrow */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-0 h-0"
        style={
          pos.arrowSide === "left"
            ? {
                right: "100%",
                borderTop: "9px solid transparent",
                borderBottom: "9px solid transparent",
                borderRight: "10px solid rgba(14,22,18,0.95)",
                opacity: isOpen && !isClosing ? 1 : 0,
                transform: `translateY(-50%) translateX(${isOpen && !isClosing ? "0" : "8px"})`,
                transition: "opacity .25s .12s ease, transform .3s .12s cubic-bezier(.34,1.56,.64,1)",
              }
            : {
                left: "100%",
                borderTop: "9px solid transparent",
                borderBottom: "9px solid transparent",
                borderLeft: "10px solid rgba(14,22,18,0.95)",
                opacity: isOpen && !isClosing ? 1 : 0,
                transform: `translateY(-50%) translateX(${isOpen && !isClosing ? "0" : "-8px"})`,
                transition: "opacity .25s .12s ease, transform .3s .12s cubic-bezier(.34,1.56,.64,1)",
              }
        }
      />

      {/* Panel */}
      <div
        className="pointer-events-auto w-60 rounded-2xl border overflow-hidden"
        style={{
          background: "rgba(14,22,18,0.93)",
          borderColor: "rgba(255,255,255,0.14)",
          backdropFilter: "blur(28px)",
          boxShadow: "0 24px 64px rgba(0,0,0,.7), inset 0 0 0 1px rgba(255,255,255,.04)",
          transformOrigin: pos.transformOrigin,
          opacity: isClosing ? 0 : isOpen ? 1 : 0,
          transform: isClosing
            ? `scale(.88) translateX(${pos.arrowSide === "left" ? "-6px" : "6px"})`
            : isOpen
            ? "scale(1) translateX(0)"
            : `scale(.85) translateX(${pos.arrowSide === "left" ? "-8px" : "8px"})`,
          filter: isOpen && !isClosing ? "blur(0px)" : "blur(4px)",
          transition: isClosing
            ? "opacity .22s ease, transform .22s ease, filter .2s ease"
            : "opacity .32s cubic-bezier(.22,1,.36,1), transform .38s cubic-bezier(.34,1.56,.64,1), filter .28s ease",
        }}
      >
        {/* Header */}
        <div
          className="px-3.5 py-3 border-b border-white/8"
          style={{
            opacity: isOpen && !isClosing ? 1 : 0,
            transform: isOpen && !isClosing ? "translateY(0)" : "translateY(4px)",
            transition: "opacity .2s .15s ease, transform .25s .15s ease",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: course.color, boxShadow: `0 0 6px ${course.color}99` }} />
            <span className="text-[10px] font-mono text-white/60 tracking-wider">{course.id}</span>
          </div>
          <div className="text-sm font-medium text-white leading-tight">{course.name}</div>
        </div>

        {/* Lecture list */}
        <div
          className="px-1.5 py-1.5"
          style={{
            opacity: isOpen && !isClosing ? 1 : 0,
            transform: isOpen && !isClosing ? "translateY(0)" : "translateY(6px)",
            transition: "opacity .2s .22s ease, transform .25s .22s ease",
          }}
        >
          {lectures.length === 0 ? (
            <p className="text-[10px] text-white/25 text-center py-3">No lectures yet</p>
          ) : (
            lectures.map(job => {
              const name = job.displayName ?? cleanName(job.fileName ?? job.uploadKey);
              return (
                <div
                  key={job.uploadKey}
                  onClick={() => job.status === "done" && onClickLecture(job)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                    job.status === "done" ? "cursor-pointer hover:bg-white/7" : "opacity-50"
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `${course.color}18`, border: `1px solid ${course.color}33` }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={course.color} strokeWidth={2}>
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-white truncate">{name}</div>
                    <div className="text-[9px] text-white/30 mt-0.5">{timeAgo(job.createdAt)}</div>
                  </div>
                  <span className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${statusStyle[job.status] ?? "text-white/30 bg-white/5 border-white/10"}`}>
                    {statusLabel[job.status] ?? job.status}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-3.5 py-2.5 border-t border-white/8 flex justify-center"
          style={{
            opacity: isOpen && !isClosing ? 1 : 0,
            transform: isOpen && !isClosing ? "translateY(0)" : "translateY(4px)",
            transition: "opacity .2s .28s ease, transform .2s .28s ease",
          }}
        >
          <button
            onClick={onClose}
            className="text-[10px] px-4 py-1.5 rounded-lg border transition-colors"
            style={{ color: course.color, background: `${course.color}0f`, borderColor: `${course.color}33` }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}