"use client";

import { useState } from "react";
import { Course } from "./types";

interface CourseManagerProps {
  courses: Course[];
  addingCourse: boolean;
  newCourseName: string;
  onSetAdding: (v: boolean) => void;
  onSetNewName: (v: string) => void;
  onAdd: () => void;
  onDropLecture: (courseId: string) => void;
  isDark: boolean;
}

export function CourseManager({
  courses, addingCourse, newCourseName,
  onSetAdding, onSetNewName, onAdd, onDropLecture, isDark,
}: CourseManagerProps) {
  const T = isDark
    ? {
        surface: "bg-white/[0.04] border-white/10",
        input: "bg-white/[0.04] border-white/10 text-white placeholder-white/25 focus:border-white/25",
        textFaint: "text-white/25",
        text: "text-white",
        clRow: "hover:bg-white/6 hover:border-white/10",
      }
    : {
        surface: "bg-white/60 border-black/8",
        input: "bg-white/60 border-black/10 text-gray-800 placeholder-gray-400 focus:border-black/20",
        textFaint: "text-gray-400",
        text: "text-gray-900",
        clRow: "hover:bg-black/4 hover:border-black/8",
      };

  return (
    <div className={`rounded-2xl border p-4 flex-1 ${T.surface}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[9px] uppercase tracking-widest ${T.textFaint}`}>Courses</span>
        <button onClick={() => onSetAdding(true)} className="text-[10px] text-green-400 hover:text-green-300 font-medium">
          + Add
        </button>
      </div>
      <div className="space-y-0.5">
        {courses.map(c => (
          <div
            key={c.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); onDropLecture(c.id); }}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border border-transparent transition-all cursor-pointer ${T.clRow}`}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: c.color, boxShadow: `0 0 5px ${c.color}66` }}
            />
            <span className={`text-xs flex-1 truncate ${T.text}`}>{c.name}</span>
            <span className={`text-[10px] font-mono ${T.textFaint}`}>{c.lectureCount}</span>
          </div>
        ))}
        {courses.length === 0 && !addingCourse && (
          <p className={`text-[10px] text-center py-2 ${T.textFaint}`}>No courses yet</p>
        )}
        {addingCourse && (
          <div className="flex gap-1.5 mt-2">
            <input
              autoFocus
              value={newCourseName}
              onChange={e => onSetNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") onAdd(); if (e.key === "Escape") onSetAdding(false); }}
              placeholder="Course name…"
              className={`flex-1 text-xs border rounded-lg px-2 py-1.5 outline-none ${T.input}`}
            />
            <button onClick={onAdd} className="text-[10px] bg-green-500/80 hover:bg-green-500 text-white px-2.5 py-1.5 rounded-lg transition-colors">
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}