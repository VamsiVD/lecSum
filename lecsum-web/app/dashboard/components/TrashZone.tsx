"use client";

import { useState } from "react";

interface TrashZoneProps {
  onDrop: () => void;
  isDark: boolean;
}

export function TrashZone({ onDrop, isDark }: TrashZoneProps) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(); }}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed transition-all text-sm
        ${over
          ? "border-red-400/60 bg-red-400/8 text-red-400 scale-[1.02]"
          : isDark
          ? "border-white/10 text-white/25 hover:border-red-400/30 hover:text-red-400/60"
          : "border-black/10 text-gray-400 hover:border-red-400/30 hover:text-red-500"
        }`}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
      </svg>
      <span className="text-xs">{over ? "Release to delete" : "Drag here to delete"}</span>
    </div>
  );
}