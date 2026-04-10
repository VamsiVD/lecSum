"use client";

import { useState } from "react";
import { Course } from "./types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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

  const selectedLabel = courses.find(c => c.id === selectedCourse)?.name ?? "No course";
  const selectedColor = courses.find(c => c.id === selectedCourse)?.color;

  const T = isDark
    ? { surface: "bg-white/[0.04] border-white/10", textFaint: "text-white/25", textMuted: "text-white/50" }
    : { surface: "bg-white/60 border-black/8", textFaint: "text-gray-400", textMuted: "text-gray-500" };

  return (
    <div className={`rounded-2xl border p-4 ${T.surface}`}>
      <div className={`text-[9px] uppercase tracking-widest mb-3 ${T.textFaint}`}>New Lecture</div>

      {/* Course dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`w-full justify-between mb-3 text-xs h-8 px-2.5 flex items-center rounded-md border outline-none focus:ring-2 focus:ring-offset-2 ${
            isDark
              ? "bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08] hover:text-white focus:ring-white/20"
              : "bg-white/60 border-black/10 text-gray-800 hover:bg-white/80 focus:ring-black/20"
          }`}
        >
          <span className="flex items-center gap-2">
            {selectedColor && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: selectedColor }} />
            )}
            {selectedLabel}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="opacity-50">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={`w-52 ${isDark ? "bg-[#0d1512] border-white/10 text-white" : "bg-white border-black/10 text-gray-900"}`}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className={`text-[9px] uppercase tracking-widest ${isDark ? "text-white/30" : "text-gray-400"}`}>
              Assign to course
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={selectedCourse} onValueChange={onSelectCourse}>
              <DropdownMenuRadioItem
                value=""
                className={`text-xs ${isDark ? "text-white/60 focus:bg-white/8 focus:text-white" : "text-gray-600 focus:bg-black/5"}`}
              >
                No course
              </DropdownMenuRadioItem>
              {courses.map(c => (
                <DropdownMenuRadioItem
                  key={c.id}
                  value={c.id}
                  className={`text-xs ${isDark ? "text-white focus:bg-white/8" : "text-gray-900 focus:bg-black/5"}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Drop zone */}
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