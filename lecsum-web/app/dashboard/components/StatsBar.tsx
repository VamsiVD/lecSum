"use client";

import { Job } from "./types";

interface StatsBarProps {
  jobs: Job[];
  statBox: string;
  textFaint: string;
}

export function StatsBar({ jobs, statBox, textFaint }: StatsBarProps) {
  const stats = [
    { label: "Total", value: jobs.length },
    { label: "Ready", value: jobs.filter(j => j.status === "done").length },
    { label: "Processing", value: jobs.filter(j => ["transcribing", "extracting", "uploaded"].includes(j.status)).length },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {stats.map(s => (
        <div key={s.label} className={`rounded-xl border px-4 py-3 backdrop-blur-sm ${statBox}`}>
          <div className="text-2xl" style={{ fontFamily: "'DM Serif Display',serif" }}>{s.value}</div>
          <div className={`text-[10px] uppercase tracking-widest mt-0.5 ${textFaint}`}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}