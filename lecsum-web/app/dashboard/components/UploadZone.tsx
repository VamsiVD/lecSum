"use client";

import { useState, useEffect } from "react";
import { Course } from "./types";

interface UploadZoneProps {
  courses: Course[];
  selectedCourse: string;
  onSelectCourse: (id: string) => void;
  onUpload: (file: File, course: string) => void;
  uploading: boolean;
  uploadError: string;
  isDark: boolean;
}

export function UploadZone({ courses, selectedCourse, onSelectCourse, onUpload, uploading, uploadError, isDark }: UploadZoneProps) {
  const [draggingFile, setDraggingFile] = useState(false);

  const T = isDark
    ? {
        surface: "bg-white/[0.04] border-white/10",
        input: "bg-white/[0.04] border-white/10 text-white placeholder-white/25 focus:border-white/25",
        textFaint: "text-white/25",
        textMuted: "text-white/50",
      }
    : {
        surface: "bg-white/60 border-black/8",
        input: "bg-white/60 border-black/10 text-gray-800 placeholder-gray-400 focus:border-black/20",
        textFaint: "text-gray-400",
        textMuted: "text-gray-500",
      };

  return (
    <div className={`rounded-2xl border p-4 ${T.surface}`}>
      <div className={`text-[9px] uppercase tracking-widest mb-3 ${T.textFaint}`}>New Lecture</div>
      <select
        key={courses.map(c => c.id).join(",")}
        value={selectedCourse}
        onChange={e => onSelectCourse(e.target.value)}
        className={`w-full text-xs border rounded-lg px-2 py-1.5 mb-3 outline-none backdrop-blur-sm ${T.input}`}
        style={{ colorScheme: isDark ? "dark" : "light" }}
      >
        <option value="" className={isDark ? "bg-[#0d1512] text-white" : "bg-white text-gray-900"}>
          No course
        </option>
        {courses.map(c => (
          <option key={c.id} value={c.id} className={isDark ? "bg-[#0d1512] text-white" : "bg-white text-gray-900"}>
            {c.name}
          </option>
        ))}
      </select>
      <label
        onDragOver={e => { e.preventDefault(); if (e.dataTransfer.types.includes("Files")) setDraggingFile(true); }}
        onDragLeave={() => setDraggingFile(false)}
        onDrop={e => {
          e.preventDefault();
          setDraggingFile(false);
          const f = e.dataTransfer.files[0];
          if (f) onUpload(f, selectedCourse);
        }}
        className={`flex flex-col items-center gap-2 border border-dashed rounded-xl p-5 cursor-pointer transition-all
          ${draggingFile
            ? isDark ? "border-green-400/50 bg-green-400/5" : "border-green-600/40 bg-green-600/4"
            : isDark
            ? "border-white/10 hover:border-green-400/30 hover:bg-green-400/[0.03]"
            : "border-black/10 hover:border-green-600/30 hover:bg-green-600/[0.03]"}`}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "bg-white/8" : "bg-black/6"}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <span className={`text-[10px] text-center ${T.textMuted}`}>Drop files or click</span>
        <span className={`text-[9px] tracking-wide ${T.textFaint}`}>MP3 · PDF · DOCX · PPTX</span>
        <input
          type="file"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f, selectedCourse); }}
        />
      </label>
      {uploading && <p className={`text-xs mt-2 text-center ${T.textMuted}`}>Uploading…</p>}
      {uploadError && <p className="text-xs mt-2 text-center text-red-400">{uploadError}</p>}
    </div>
  );
}