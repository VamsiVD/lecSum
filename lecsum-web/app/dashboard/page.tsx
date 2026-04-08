"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Job {
  uploadKey: string;
  jobName?: string;
  transcriptKey?: string;
  fileName?: string;
  displayName?: string;
  status: string;
  createdAt?: string;
  course?: string;
}

interface Course {
  id: string;
  name: string;
  color: string;
  lectureCount: number;
}

const COURSE_COLORS = [
  "#4ade80", "#60a5fa", "#fbbf24", "#f87171",
  "#a78bfa", "#34d399", "#fb923c", "#e879f9",
];

// Generate a deep gradient from a course color
function courseGradient(hex: string): string {
  const map: Record<string, string> = {
    "#4ade80": "linear-gradient(135deg,#041a0e 0%,#073d1c 30%,#0f6635 55%,#1a9448 75%,#4ade8044 100%)",
    "#60a5fa": "linear-gradient(135deg,#020b1a 0%,#041a38 30%,#082d60 55%,#1050a0 75%,#60a5fa44 100%)",
    "#fbbf24": "linear-gradient(135deg,#130900 0%,#2e1500 30%,#4f2500 55%,#7a3c00 75%,#fbbf2444 100%)",
    "#f87171": "linear-gradient(135deg,#1a0404 0%,#3d0a0a 30%,#6b1111 55%,#991c1c 75%,#f8717144 100%)",
    "#a78bfa": "linear-gradient(135deg,#0d0520 0%,#1e0d42 30%,#33166e 55%,#4c1fa0 75%,#a78bfa44 100%)",
    "#34d399": "linear-gradient(135deg,#021810 0%,#053826 30%,#0a5c3e 55%,#108057 75%,#34d39944 100%)",
    "#fb923c": "linear-gradient(135deg,#160500 0%,#311000 30%,#541c00 55%,#7c2900 75%,#fb923c44 100%)",
    "#e879f9": "linear-gradient(135deg,#1a0520 0%,#3d0a48 30%,#6b117a 55%,#9918a8 75%,#e879f944 100%)",
  };
  return map[hex] ?? `linear-gradient(135deg,#111 0%,#222 50%,${hex}44 100%)`;
}

function timeAgo(iso?: string): string {
  if (!iso) return "Unknown";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function cleanName(raw: string) {
  return raw.replace(/^[a-z0-9]+-\d+-/, "").replace(/\.[^.]+$/, "");
}

// ── Inline rename input ─────────────────────────────────────────────────────
function RenameInput({
  value,
  onSave,
  onCancel,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  className?: string;
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
      className={`bg-transparent border-b border-white/40 outline-none text-white placeholder-white/40 ${className}`}
    />
  );
}

// ── Course card (full-height gradient + text overlay) ───────────────────────
function CourseCard({
  course,
  jobs,
  onDrop,
  onRename,
  onRemove,
}: {
  course: Course;
  jobs: Job[];
  onDrop: (courseId: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [over, setOver] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const lectures = jobs.filter(j => j.course === course.id);
  const ready = lectures.filter(j => j.status === "done").length;

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(course.id); }}
      className={`relative rounded-2xl overflow-hidden border transition-all duration-200 select-none group
        ${over ? "scale-[1.02] border-white/30" : "border-white/10 hover:border-white/20 hover:-translate-y-0.5"}
      `}
      style={{ height: 152 }}
    >
      {/* gradient fill */}
      <div className="absolute inset-0" style={{ background: courseGradient(course.color) }} />
      {/* vignette */}
      <div className="absolute inset-0" style={{ background: over ? "rgba(255,255,255,0.07)" : "linear-gradient(160deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,.6) 100%)" }} />

      {/* content */}
      <div className="absolute inset-0 p-3.5 flex flex-col justify-between z-10">
        {/* top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: course.color, boxShadow: `0 0 6px ${course.color}aa` }} />
            {renaming ? (
              <RenameInput
                value={course.name}
                onSave={v => { onRename(course.id, v); setRenaming(false); }}
                onCancel={() => setRenaming(false)}
                className="text-xs font-mono w-28"
              />
            ) : (
              <span
                className="text-xs font-mono text-white/80 tracking-wide cursor-pointer hover:text-white"
                onDoubleClick={() => setRenaming(true)}
              >{course.name}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-white/50 bg-black/25 px-1.5 py-0.5 rounded backdrop-blur-sm">
              {lectures.length} lecture{lectures.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onRemove(course.id); }}
              className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white/80 text-xs transition-opacity"
            >✕</button>
          </div>
        </div>

        {/* course name big */}
        <div className="flex-1 flex items-center py-1">
          <p className="text-white font-serif text-lg leading-tight" style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.2px", textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}>
            {course.name}
          </p>
        </div>

        {/* bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {["Summary", "Quiz", "Cards"].map(t => (
              <span key={t} className="text-white/50 text-[9px] font-medium uppercase tracking-wider bg-white/10 border border-white/15 px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-white/50">
            {ready}/{lectures.length} ready
          </span>
        </div>
      </div>

      {/* drop highlight ring */}
      {over && <div className="absolute inset-0 border-2 rounded-2xl" style={{ borderColor: course.color }} />}
    </div>
  );
}

// ── Lecture card (unassigned grid) ──────────────────────────────────────────
function LectureCard({
  job,
  courses,
  onClick,
  onDragStart,
  onRename,
}: {
  job: Job;
  courses: Course[];
  onClick: () => void;
  onDragStart: (key: string) => void;
  onRename: (key: string, name: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const course = courses.find(c => c.id === job.course);
  const displayName = job.displayName ?? cleanName(job.fileName ?? job.uploadKey);

  const statusStyle: Record<string, string> = {
    done: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
    transcribing: "text-blue-400 bg-blue-400/10 border-blue-400/25",
    extracting: "text-blue-400 bg-blue-400/10 border-blue-400/25",
    error: "text-red-400 bg-red-400/10 border-red-400/25",
    uploaded: "text-amber-400 bg-amber-400/10 border-amber-400/25",
  };
  const statusLabel: Record<string, string> = {
    done: "Ready", transcribing: "Processing", extracting: "Extracting",
    error: "Failed", uploaded: "Queued", pending: "Pending",
  };

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart(job.uploadKey); }}
      onClick={job.status === "done" ? onClick : undefined}
      className={`glass-card rounded-xl p-3.5 transition-all select-none group
        ${job.status === "done" ? "cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95 hover:-translate-y-0.5" : "opacity-60 cursor-grab"}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <RenameInput
              value={displayName}
              onSave={v => { onRename(job.uploadKey, v); setRenaming(false); }}
              onCancel={() => setRenaming(false)}
              className="text-sm w-full border-b border-current"
            />
          ) : (
            <p
              className="text-sm font-medium truncate cursor-text"
              onDoubleClick={e => { e.stopPropagation(); setRenaming(true); }}
              title="Double-click to rename"
            >{displayName}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            {course && (
              <span className="flex items-center gap-1 text-[10px] opacity-60">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: course.color }} />
                {course.name}
              </span>
            )}
            <span className="text-[10px] opacity-40">{timeAgo(job.createdAt)}</span>
          </div>
        </div>
        <span className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${statusStyle[job.status] ?? "text-gray-400 bg-gray-400/10 border-gray-400/25"}`}>
          {statusLabel[job.status] ?? job.status}
        </span>
      </div>
      {job.status === "done" && (
        <div className="flex gap-1 pt-2 border-t border-white/8">
          {["Summary", "Quiz", "Flashcards"].map(t => (
            <span key={t} className="text-[9px] uppercase tracking-wider opacity-40 bg-white/6 border border-white/10 px-1.5 py-0.5 rounded">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Trash zone ──────────────────────────────────────────────────────────────
function TrashZone({ onDrop }: { onDrop: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(); }}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed transition-all text-sm
        ${over ? "border-red-400/60 bg-red-400/8 text-red-400 scale-[1.02]" : "border-white/10 text-white/25 hover:border-red-400/30 hover:text-red-400/60"}
      `}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
      </svg>
      <span className="text-xs">{over ? "Release to delete" : "Drag here to delete"}</span>
    </div>
  );
}

// ── Delete modal ─────────────────────────────────────────────────────────────
function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card rounded-2xl p-6 max-w-sm w-full mx-4 border border-white/15">
        <div className="w-10 h-10 rounded-full bg-red-400/15 border border-red-400/25 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          </svg>
        </div>
        <h3 className="text-base font-semibold mb-1">Delete lecture?</h3>
        <p className="text-sm opacity-50 mb-5"><span className="opacity-80 font-medium">{name}</span> will be permanently removed.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 text-sm border border-white/15 rounded-xl px-4 py-2 hover:bg-white/5 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 text-sm bg-red-500/80 hover:bg-red-500 text-white rounded-xl px-4 py-2 transition-colors font-medium">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [addingCourse, setAddingCourse] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const draggingKey = useRef<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [draggingFile, setDraggingFile] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lecsum-courses");
    if (saved) setCourses(JSON.parse(saved));
    const theme = localStorage.getItem("lecsum-theme");
    if (theme) setIsDark(theme === "dark");
  }, []);

  const saveCourses = (updated: Course[]) => {
    setCourses(updated);
    localStorage.setItem("lecsum-courses", JSON.stringify(updated));
  };

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/lectures");
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.lectures ?? []);
    } catch { /* silently fail */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchJobs();
    const iv = setInterval(fetchJobs, 10000);
    return () => clearInterval(iv);
  }, [fetchJobs]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("lecsum-theme", next ? "dark" : "light");
  };

  // ── Course rename ──
  const renameCourse = (id: string, name: string) => {
    saveCourses(courses.map(c => c.id === id ? { ...c, name } : c));
  };

  const addCourse = () => {
    if (!newCourseName.trim()) return;
    const course: Course = {
      id: Date.now().toString(),
      name: newCourseName.trim(),
      color: COURSE_COLORS[courses.length % COURSE_COLORS.length],
      lectureCount: 0,
    };
    saveCourses([...courses, course]);
    setNewCourseName("");
    setAddingCourse(false);
  };

  const removeCourse = (id: string) => saveCourses(courses.filter(c => c.id !== id));

  // ── Lecture rename (optimistic + PATCH) ──
  const renameLecture = async (uploadKey: string, displayName: string) => {
    setJobs(prev => prev.map(j => j.uploadKey === uploadKey ? { ...j, displayName } : j));
    try {
      await fetch(`/api/lectures/${encodeURIComponent(uploadKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
    } catch { fetchJobs(); }
  };

  // ── Drag ──
  const handleDragStart = (key: string) => { draggingKey.current = key; };

  const handleDropOnCourse = async (courseId: string) => {
    const key = draggingKey.current; if (!key) return; draggingKey.current = null;
    setJobs(prev => prev.map(j => j.uploadKey === key ? { ...j, course: courseId } : j));
    try {
      await fetch(`/api/lectures/${encodeURIComponent(key)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: courseId }),
      });
    } catch { fetchJobs(); }
  };

  const handleDropOnTrash = () => {
    const key = draggingKey.current; if (!key) return; draggingKey.current = null;
    const job = jobs.find(j => j.uploadKey === key);
    if (job) setDeleteTarget(job);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const key = deleteTarget.uploadKey; setDeleteTarget(null);
    setJobs(prev => prev.filter(j => j.uploadKey !== key));
    try { await fetch(`/api/lectures/${encodeURIComponent(key)}`, { method: "DELETE" }); }
    catch { fetchJobs(); }
  };

  // ── Upload ──
  const handleUpload = async (file: File, course: string) => {
    setUploading(true); setUploadError("");
    try {
      const hashBuffer = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
      const key = file.name;
      const res = await fetch("/api/upload-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: key, contentType: file.type || "application/octet-stream", hash }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { url } = await res.json();
      const up = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
      if (!up.ok) throw new Error("Upload failed");
      router.push(`/processing?key=${encodeURIComponent(key)}&course=${encodeURIComponent(course)}`);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  };

  const enrichedCourses = courses.map(c => ({ ...c, lectureCount: jobs.filter(j => j.course === c.id).length }));

  const assignedKeys = new Set(jobs.filter(j => j.course).map(j => j.uploadKey));
  const unassigned = jobs.filter(j => !j.course || j.course === "");

  const filtered = (courseFilter === "all" ? jobs : courseFilter === "" ? unassigned : jobs.filter(j => j.course === courseFilter))
    .filter(j => (j.displayName ?? cleanName(j.fileName ?? j.uploadKey)).toLowerCase().includes(search.toLowerCase()));

  // ── Theme classes ──
  const T = isDark ? {
    bg: "bg-[#0d1512]",
    orb1: "bg-[radial-gradient(circle,#0d3d26_0%,transparent_70%)]",
    orb2: "bg-[radial-gradient(circle,#0a2a3a_0%,transparent_70%)]",
    orb3: "bg-[radial-gradient(circle,#1a1040_0%,transparent_70%)]",
    grid: "opacity-[0.07]",
    rail: "bg-black/40 border-white/8",
    railIcon: "text-white/40 hover:text-white hover:bg-white/8",
    railActive: "text-green-400 bg-white/10",
    surface: "bg-white/[0.04] border-white/10",
    surfaceHover: "hover:bg-white/[0.06]",
    text: "text-white",
    textMuted: "text-white/50",
    textFaint: "text-white/25",
    input: "bg-white/[0.04] border-white/10 text-white placeholder-white/25 focus:border-white/25",
    sidebar: "bg-black/35 border-white/8",
    statBox: "bg-white/[0.04] border-white/10",
    toggleTrack: "bg-white/10",
    toggleThumb: "translate-x-0 bg-white/60",
    searchBox: "bg-white/[0.04] border-white/10 text-white/50",
    kbd: "bg-white/8 border-white/10 text-white/25",
    uploadHover: "hover:border-green-400/30 hover:bg-green-400/[0.03]",
    clRow: "hover:bg-white/6 hover:border-white/10",
    glowLine: "border-white/8",
  } : {
    bg: "bg-[#eef3f0]",
    orb1: "bg-[radial-gradient(circle,#c8e6d4_0%,transparent_70%)]",
    orb2: "bg-[radial-gradient(circle,#c5ddf0_0%,transparent_70%)]",
    orb3: "bg-[radial-gradient(circle,#d5cef5_0%,transparent_70%)]",
    grid: "opacity-[0.06]",
    rail: "bg-white/70 border-black/8",
    railIcon: "text-black/40 hover:text-black/80 hover:bg-black/5",
    railActive: "text-green-700 bg-black/7",
    surface: "bg-white/60 border-black/8",
    surfaceHover: "hover:bg-white/80",
    text: "text-gray-900",
    textMuted: "text-gray-500",
    textFaint: "text-gray-400",
    input: "bg-white/60 border-black/10 text-gray-800 placeholder-gray-400 focus:border-black/20",
    sidebar: "bg-white/50 border-black/8",
    statBox: "bg-white/60 border-black/8",
    toggleTrack: "bg-green-400/30",
    toggleThumb: "translate-x-4 bg-green-600",
    searchBox: "bg-white/60 border-black/10 text-gray-500",
    kbd: "bg-black/6 border-black/10 text-gray-400",
    uploadHover: "hover:border-green-600/30 hover:bg-green-600/[0.03]",
    clRow: "hover:bg-black/4 hover:border-black/8",
    glowLine: "border-black/8",
  };

  return (
    <div className={`min-h-screen overflow-hidden ${T.bg} ${T.text}`}>
      {/* ── Background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute w-[480px] h-[480px] -top-28 -left-20 rounded-full blur-[90px] opacity-60 ${T.orb1}`} />
        <div className={`absolute w-[560px] h-[560px] top-20 -right-40 rounded-full blur-[90px] opacity-60 ${T.orb2}`} />
        <div className={`absolute w-[380px] h-[380px] -bottom-16 left-44 rounded-full blur-[90px] opacity-60 ${T.orb3}`} />
        {/* grid lines */}
        <div
          className={`absolute inset-0 ${T.grid}`}
          style={{
            backgroundImage: `linear-gradient(${isDark ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)"} 1px,transparent 1px),linear-gradient(90deg,${isDark ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)"} 1px,transparent 1px)`,
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      {/* ── Layout ── */}
      <div className="relative z-10 flex min-h-screen">
        {/* Rail */}
        <div className={`w-12 flex-shrink-0 flex flex-col items-center py-3 gap-1 border-r backdrop-blur-xl ${T.rail}`}>
          {[
            <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
            <><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>,
            <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
          ].map((icon, i) => (
            <button key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${i === 0 ? T.railActive : T.railIcon}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>{icon}</svg>
            </button>
          ))}
          <div className="mt-auto mb-2 w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center text-white text-[10px] font-medium border border-white/20">
            VD
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0 p-5 overflow-hidden">
          {/* Topbar */}
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-serif" style={{ fontFamily: "'DM Serif Display',serif", letterSpacing: "-0.5px" }}>Dashboard</h1>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 backdrop-blur-md ${T.searchBox}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className={`bg-transparent outline-none text-xs w-32 ${T.textMuted} placeholder:${T.textFaint}`}
                />
                <span className={`text-[9px] font-mono border rounded px-1 py-0.5 ${T.kbd}`}>Ctrl+K</span>
              </div>
              {/* Theme toggle */}
              <button onClick={toggleTheme} className="flex items-center gap-2 cursor-pointer">
                <div className={`w-9 h-5 rounded-full relative transition-colors duration-300 ${T.toggleTrack}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-300 shadow ${T.toggleThumb}`} />
                </div>
                <span className="text-sm">{isDark ? "🌙" : "☀️"}</span>
              </button>
            </div>
          </div>

          {/* Course filter tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {[{ id: "all", label: "All" }, { id: "", label: "Unassigned" }, ...enrichedCourses.map(c => ({ id: c.id, label: c.name }))].map(f => (
              <button
                key={f.id}
                onClick={() => setCourseFilter(f.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap flex-shrink-0
                  ${courseFilter === f.id
                    ? isDark ? "bg-white/12 border-white/20 text-white" : "bg-black/8 border-black/12 text-gray-900"
                    : isDark ? "bg-transparent border-white/8 text-white/40 hover:text-white/70 hover:border-white/15" : "bg-transparent border-black/8 text-gray-400 hover:text-gray-700"
                  }`}
              >{f.label}</button>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Total", value: jobs.length },
              { label: "Ready", value: jobs.filter(j => j.status === "done").length },
              { label: "Processing", value: jobs.filter(j => ["transcribing","extracting","uploaded"].includes(j.status)).length },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border px-4 py-3 backdrop-blur-sm ${T.statBox}`}>
                <div className="text-2xl font-serif" style={{ fontFamily: "'DM Serif Display',serif" }}>{s.value}</div>
                <div className={`text-[10px] uppercase tracking-widest mt-0.5 ${T.textFaint}`}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Course cards grid */}
          {enrichedCourses.length > 0 && (
            <>
              <div className={`text-[9px] uppercase tracking-widest mb-2 ${T.textFaint}`}>Courses</div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {enrichedCourses.map(c => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    jobs={jobs}
                    onDrop={handleDropOnCourse}
                    onRename={renameCourse}
                    onRemove={removeCourse}
                  />
                ))}
              </div>
            </>
          )}

          {/* Lecture grid */}
          <div className={`text-[9px] uppercase tracking-widest mb-2 ${T.textFaint}`}>
            {courseFilter === "all" ? "All lectures" : courseFilter === "" ? "Unassigned" : enrichedCourses.find(c => c.id === courseFilter)?.name ?? "Lectures"}
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`rounded-xl border h-20 animate-pulse ${T.statBox}`} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className={`rounded-xl border p-8 text-center ${T.surface}`}>
              <p className={`text-sm ${T.textMuted}`}>No lectures{search ? " match your search" : " yet"}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map(job => (
                <LectureCard
                  key={job.uploadKey}
                  job={job}
                  courses={enrichedCourses}
                  onDragStart={handleDragStart}
                  onRename={renameLecture}
                  onClick={() => router.push(`/study?key=${encodeURIComponent(job.transcriptKey ?? "")}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={`w-64 flex-shrink-0 border-l backdrop-blur-2xl flex flex-col gap-3 p-4 ${T.sidebar}`}>
          {/* Upload */}
          <div className={`rounded-2xl border p-4 ${T.surface}`}>
            <div className={`text-[9px] uppercase tracking-widest mb-3 ${T.textFaint}`}>New Lecture</div>
            <select
              key={courses.map(c => c.id).join(",")}
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className={`w-full text-xs border rounded-lg px-2 py-1.5 mb-3 outline-none backdrop-blur-sm ${T.input}`}
            >
              <option value="">No course</option>
              {enrichedCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label
              onDragOver={e => { e.preventDefault(); if (e.dataTransfer.types.includes("Files")) setDraggingFile(true); }}
              onDragLeave={() => setDraggingFile(false)}
              onDrop={e => {
                e.preventDefault(); setDraggingFile(false);
                const f = e.dataTransfer.files[0];
                if (f) handleUpload(f, selectedCourse);
              }}
              className={`flex flex-col items-center gap-2 border border-dashed rounded-xl p-5 cursor-pointer transition-all
                ${draggingFile
                  ? isDark ? "border-green-400/50 bg-green-400/5" : "border-green-600/40 bg-green-600/4"
                  : isDark ? `border-white/10 ${T.uploadHover}` : `border-black/10 ${T.uploadHover}`
                }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "bg-white/8" : "bg-black/6"}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <span className={`text-[10px] text-center ${T.textMuted}`}>Drop files or click</span>
              <span className={`text-[9px] text-center tracking-wide ${T.textFaint}`}>MP3 · PDF · DOCX · PPTX</span>
              <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f, selectedCourse); }} />
            </label>
            {uploading && <p className={`text-xs mt-2 text-center ${T.textMuted}`}>Uploading…</p>}
            {uploadError && <p className="text-xs mt-2 text-center text-red-400">{uploadError}</p>}
          </div>

          {/* Courses */}
          <div className={`rounded-2xl border p-4 flex-1 ${T.surface}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[9px] uppercase tracking-widest ${T.textFaint}`}>Courses</span>
              <button onClick={() => setAddingCourse(true)} className="text-[10px] text-green-400 hover:text-green-300 font-medium">+ Add</button>
            </div>
            <div className="space-y-0.5">
              {enrichedCourses.map(c => (
                <div
                  key={c.id}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleDropOnCourse(c.id); }}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border border-transparent transition-all cursor-pointer ${T.clRow}`}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color, boxShadow: `0 0 5px ${c.color}66` }} />
                  <span className={`text-xs flex-1 truncate ${T.text}`}>{c.name}</span>
                  <span className={`text-[10px] font-mono ${T.textFaint}`}>{c.lectureCount}</span>
                </div>
              ))}
              {enrichedCourses.length === 0 && !addingCourse && (
                <p className={`text-[10px] text-center py-2 ${T.textFaint}`}>No courses yet</p>
              )}
              {addingCourse && (
                <div className="flex gap-1.5 mt-2">
                  <input
                    autoFocus
                    value={newCourseName}
                    onChange={e => setNewCourseName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") addCourse(); if (e.key === "Escape") setAddingCourse(false); }}
                    placeholder="Course name…"
                    className={`flex-1 text-xs border rounded-lg px-2 py-1.5 outline-none ${T.input}`}
                  />
                  <button onClick={addCourse} className="text-[10px] bg-green-500/80 hover:bg-green-500 text-white px-2.5 py-1.5 rounded-lg transition-colors">Add</button>
                </div>
              )}
            </div>
          </div>

          <TrashZone onDrop={handleDropOnTrash} />
        </div>
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.displayName ?? cleanName(deleteTarget.fileName ?? deleteTarget.uploadKey)}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Global glass card style */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap');
        .glass-card {
          background: ${isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)"};
          border: 1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"};
          backdrop-filter: blur(16px);
        }
        .font-serif { font-family: 'DM Serif Display', serif; }
      `}</style>
    </div>
  );
}