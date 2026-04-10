"use client";

import { useState, useRef } from "react";
import { Course, Job, courseGradient } from "./types";
import { RenameInput } from "./Renameinput";

interface CourseCardProps {
  course: Course;
  isOpen: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
  onClick: (e: React.MouseEvent) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  jobs: Job[];
  onDropLecture: (courseId: string) => void;
  onReorder: (dragId: string, dropId: string) => void;
  draggingCourseId: React.MutableRefObject<string | null>;
  isDark: boolean;
}

export function CourseCard({
  course, isOpen, cardRef, onClick, onRename, onRemove,
  jobs, onDropLecture, onReorder, draggingCourseId, isDark,
}: CourseCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [isLectureDragOver, setIsLectureDragOver] = useState(false);
  const [isReorderOver, setIsReorderOver] = useState(false);
  const divRef = useRef<HTMLDivElement | null>(null);

  const lectures = jobs.filter(j => j.course === course.id);
  const ready = lectures.filter(j => j.status === "done").length;

  const isDragOver = isLectureDragOver || isReorderOver;

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    draggingCourseId.current = course.id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("courseId", course.id);
    // ghost the card
    setTimeout(() => {
      if (divRef.current) divRef.current.style.opacity = "0.4";
    }, 0);
  };

  const handleDragEnd = () => {
    draggingCourseId.current = null;
    if (divRef.current) divRef.current.style.opacity = "1";
    setIsReorderOver(false);
    setIsLectureDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // course reorder vs lecture drop
    if (draggingCourseId.current && draggingCourseId.current !== course.id) {
      setIsReorderOver(true);
      setIsLectureDragOver(false);
    } else if (!draggingCourseId.current) {
      setIsLectureDragOver(true);
      setIsReorderOver(false);
    }
  };

  const handleDragLeave = () => {
    setIsLectureDragOver(false);
    setIsReorderOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggingCourseId.current && draggingCourseId.current !== course.id) {
      onReorder(draggingCourseId.current, course.id);
      draggingCourseId.current = null;
    } else if (!draggingCourseId.current) {
      onDropLecture(course.id);
    }
    setIsLectureDragOver(false);
    setIsReorderOver(false);
  };

  return (
    <div
      ref={el => { divRef.current = el; cardRef(el); }}
      draggable
      onClick={onClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative rounded-2xl overflow-hidden border cursor-pointer select-none group"
      style={{
        height: 152,
        borderColor: isReorderOver
          ? "rgba(255,255,255,0.6)"
          : isLectureDragOver
          ? course.color
          : isOpen
          ? isDark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.2)"
          : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
        transform: isDragOver
          ? "translateY(-4px) scale(1.02)"
          : isOpen
          ? "translateY(-4px) scale(1.015)"
          : "translateY(0) scale(1)",
        boxShadow: isReorderOver
          ? "0 0 0 2px rgba(255,255,255,0.4), 0 12px 40px rgba(0,0,0,0.4)"
          : isLectureDragOver
          ? `0 0 20px ${course.color}40`
          : isOpen
          ? isDark ? "0 20px 50px rgba(0,0,0,.55)" : "0 20px 50px rgba(0,0,0,.15)"
          : "none",
        transition: "border-color .2s, transform .35s cubic-bezier(.34,1.56,.64,1), box-shadow .2s, opacity .2s",
        background: isDark ? "transparent" : "#ffffff",
      }}
    >
      {/* Reorder indicator — top border flash */}
      {isReorderOver && (
        <div
          className="absolute top-0 inset-x-0 h-1 z-20 rounded-t-2xl"
          style={{ background: "rgba(255,255,255,0.7)" }}
        />
      )}

      {/* Gradient background */}
      <div className="absolute inset-0" style={{
        background: isDark
          ? courseGradient(course.color)
          : `linear-gradient(135deg, ${course.color}33 0%, ${course.color}05 100%)`,
      }} />

      {/* Overlay */}
      <div className="absolute inset-0" style={{
        background: isOpen
          ? isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.4)"
          : isDark
          ? "linear-gradient(160deg,rgba(0,0,0,.12) 0%,rgba(0,0,0,.62) 100%)"
          : "linear-gradient(160deg,rgba(255,255,255,0) 0%,rgba(0,0,0,.04) 100%)",
        transition: "background .3s",
      }} />

      {/* Content */}
      <div className="absolute inset-0 p-3.5 flex flex-col justify-between z-10">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: course.color,
                boxShadow: `0 0 ${isOpen ? "10px" : "5px"} ${course.color}${isOpen ? "cc" : "88"}`,
                transform: isOpen ? "scale(1.5)" : "scale(1)",
                transition: "transform .35s cubic-bezier(.34,1.56,.64,1), box-shadow .3s",
              }}
            />
            {renaming ? (
              <RenameInput
                value={course.name}
                isDark={isDark}
                onSave={v => { onRename(course.id, v); setRenaming(false); }}
                onCancel={() => setRenaming(false)}
                className="text-xs font-mono w-24"
              />
            ) : (
              <span
                className={`text-[10px] font-mono tracking-wider transition-colors ${isDark ? "text-white/75 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
                onDoubleClick={e => { e.stopPropagation(); setRenaming(true); }}
              >{course.name}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-sm ${isDark ? "text-white/40 bg-black/25" : "text-gray-600 bg-black/5"}`}>
              {lectures.length} lec
            </span>
            <button
              onClick={e => { e.stopPropagation(); onRemove(course.id); }}
              className={`opacity-0 group-hover:opacity-100 text-xs transition-opacity ${isDark ? "text-white/35 hover:text-white/80" : "text-gray-400 hover:text-gray-700"}`}
            >✕</button>
          </div>
        </div>

        {/* Course name */}
        <div
          className="flex-1 flex items-center py-1"
          style={{
            transform: isOpen ? "translateX(3px)" : "translateX(0)",
            transition: "transform .35s cubic-bezier(.34,1.56,.64,1)",
          }}
        >
          <p
            className={`text-lg leading-tight ${isDark ? "text-white" : "text-gray-900"}`}
            style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.2px", textShadow: isDark ? "0 1px 10px rgba(0,0,0,0.6)" : "none" }}
          >
            {course.name}
          </p>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {["Summary", "Quiz", "Cards"].map(t => (
              <span key={t} className={`text-[8px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${isDark ? "text-white/45 bg-white/10 border-white/13" : "text-gray-500 bg-black/5 border-black/5"}`}>{t}</span>
            ))}
          </div>
          <span className={`text-[9px] ${isDark ? "text-white/35" : "text-gray-500"}`}>{ready}/{lectures.length} ready</span>
        </div>
      </div>
    </div>
  );
}