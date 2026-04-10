"use client";

import { useState, useEffect, useRef } from "react";

export function RenameInput({ value, onSave, onCancel, className = "", isDark = true }: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  className?: string;
  isDark?: boolean;
}) {
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input
      ref={ref}
      value={val}
      onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Enter") { e.stopPropagation(); onSave(val.trim() || value); }
        if (e.key === "Escape") { e.stopPropagation(); onCancel(); }
      }}
      onBlur={() => onSave(val.trim() || value)}
      onClick={e => e.stopPropagation()}
      className={`bg-transparent border-b outline-none ${
        isDark
          ? "text-white border-white/40 placeholder-white/40"
          : "text-gray-900 border-black/30 placeholder-gray-400"
      } ${className}`}
    />
  );
}