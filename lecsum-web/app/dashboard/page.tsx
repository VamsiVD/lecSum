"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface Job {
  uploadKey: string;
  jobName?: string;
  transcriptKey?: string;
  fileName?: string;
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
  "#2563eb", "#16a34a", "#9333ea", "#ea580c",
  "#0891b2", "#be123c", "#854d0e", "#1d4ed8",
];

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    done: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    transcribing: "bg-blue-50 text-blue-700 border border-blue-200",
    extracting: "bg-blue-50 text-blue-700 border border-blue-200",
    uploaded: "bg-amber-50 text-amber-700 border border-amber-200",
    error: "bg-red-50 text-red-700 border border-red-200",
    pending: "bg-gray-50 text-gray-500 border border-gray-200",
  };
  const labels: Record<string, string> = {
    done: "Ready",
    transcribing: "Processing",
    extracting: "Extracting",
    uploaded: "Queued",
    error: "Failed",
    pending: "Pending",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? styles.pending}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ── Draggable Lecture Card ──────────────────────────────────────────────────
function LectureCard({
  job,
  courses,
  onClick,
  onDragStart,
}: {
  job: Job;
  courses: Course[];
  onClick: () => void;
  onDragStart: (uploadKey: string) => void;
}) {
  const course = courses.find(c => c.id === job.course);
  const rawName = job.fileName ?? job.uploadKey;
  const name = rawName.replace(/^[a-z0-9]+-\d+-/, "").replace(/\.[^.]+$/, "");

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart(job.uploadKey);
      }}
      onClick={job.status === "done" ? onClick : undefined}
      className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm transition-all select-none
        ${job.status === "done" ? "hover:border-blue-300 hover:shadow-md cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95" : "opacity-70 cursor-grab active:cursor-grabbing"}
      `}
    >
      {/* drag handle hint */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {course && (
              <span className="text-xs flex items-center gap-1 text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: course.color }} />
                {course.name}
              </span>
            )}
            <span className="text-xs text-gray-400">{timeAgo(job.createdAt)}</span>
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>
      {job.status === "done" && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
          {["Summary", "Quiz", "Flashcards"].map(tab => (
            <span key={tab} className="text-xs text-gray-400 bg-gray-50 rounded-md px-2 py-0.5">{tab}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Course Drop Target ──────────────────────────────────────────────────────
function CourseDropTarget({
  course,
  onDrop,
  onRemove,
  lectureCount,
}: {
  course: Course;
  onDrop: (courseId: string) => void;
  onRemove: (id: string) => void;
  lectureCount: number;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(course.id); }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 transition-all group
        ${over
          ? "border-dashed scale-[1.02]"
          : "border-transparent hover:border-dashed hover:border-gray-200"
        }`}
      style={over ? { borderColor: course.color, backgroundColor: `${course.color}10` } : {}}
    >
      <div
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform ${over ? "scale-125" : ""}`}
        style={{ backgroundColor: course.color }}
      />
      <span className="text-sm text-gray-700 flex-1 truncate">{course.name}</span>
      <span className="text-xs text-gray-400">{lectureCount}</span>
      <button
        onClick={() => onRemove(course.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity text-xs ml-1"
      >✕</button>
    </div>
  );
}

// ── Trash Drop Target ───────────────────────────────────────────────────────
function TrashZone({ onDrop }: { onDrop: () => void }) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(); }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-dashed transition-all
        ${over
          ? "border-red-400 bg-red-50 scale-[1.02]"
          : "border-gray-200 hover:border-red-300 hover:bg-red-50"
        }`}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${over ? "bg-red-100" : "bg-gray-100"}`}>
        <svg className={`w-4 h-4 transition-colors ${over ? "text-red-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <span className={`text-sm font-medium transition-colors ${over ? "text-red-600" : "text-gray-400"}`}>
        {over ? "Release to delete" : "Drag here to delete"}
      </span>
    </div>
  );
}

// ── Upload Zone ─────────────────────────────────────────────────────────────
function UploadZone({ onUpload, courses }: { onUpload: (file: File, course: string) => void; courses: Course[] }) {
  const [dragging, setDragging] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");

  // Reset selectedCourse if it no longer exists in courses
  useEffect(() => {
    if (selectedCourse && !courses.find(c => c.id === selectedCourse)) {
      setSelectedCourse("");
    }
  }, [courses, selectedCourse]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      onUpload(file, selectedCourse);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file, selectedCourse);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">New Lecture</h2>
        <select
          key={courses.map(c => c.id).join(",")}  // ← forces re-render when courses change
          value={selectedCourse}
          onChange={e => setSelectedCourse(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">No course</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <label
        onDragOver={e => { e.preventDefault(); if (e.dataTransfer.types.includes("Files")) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
        }`}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${dragging ? "bg-blue-100" : "bg-gray-100"}`}>
          <svg className={`w-4 h-4 ${dragging ? "text-blue-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-xs font-medium text-gray-600">Drop files or click</p>
        <input type="file" className="hidden" onChange={handleFile} />
      </label>
    </div>
  );
}
// ── Stats Bar ───────────────────────────────────────────────────────────────
function StatsBar({ jobs }: { jobs: Job[] }) {
  const stats = [
    { label: "Total", value: jobs.length },
    { label: "Ready", value: jobs.filter(j => j.status === "done").length },
    { label: "Processing", value: jobs.filter(j => j.status === "transcribing" || j.status === "extracting" || j.status === "uploaded").length },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Delete Confirmation Modal ───────────────────────────────────────────────
function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Delete lecture?</h3>
        <p className="text-sm text-gray-500 mb-5">
          <span className="font-medium text-gray-700">{name}</span> will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 text-sm bg-red-600 text-white rounded-xl px-4 py-2 hover:bg-red-700 transition-colors font-medium">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
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

  // Drag state
  const draggingKey = useRef<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);

  // ── Load courses from localStorage ──
  useEffect(() => {
    const saved = localStorage.getItem("lecsum-courses");
    if (saved) setCourses(JSON.parse(saved));
  }, []);

  const saveCourses = (updated: Course[]) => {
    setCourses(updated);
    localStorage.setItem("lecsum-courses", JSON.stringify(updated));
  };

  // ── Fetch jobs ──
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/lectures");
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.lectures ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // ── Course actions ──
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

  const removeCourse = (id: string) => {
    saveCourses(courses.filter(c => c.id !== id));
  };

  // ── Drag handlers ──
  const handleDragStart = (uploadKey: string) => {
    draggingKey.current = uploadKey;
  };

  const handleDropOnCourse = async (courseId: string) => {
    const key = draggingKey.current;
    if (!key) return;
    draggingKey.current = null;

    // Optimistic update
    setJobs(prev => prev.map(j => j.uploadKey === key ? { ...j, course: courseId } : j));

    try {
      await fetch(`/api/lectures/${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: courseId }),
      });
    } catch {
      fetchJobs(); // revert on failure
    }
  };

  const handleDropOnTrash = () => {
    const key = draggingKey.current;
    if (!key) return;
    draggingKey.current = null;
    const job = jobs.find(j => j.uploadKey === key);
    if (job) setDeleteTarget(job);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const key = deleteTarget.uploadKey;
    setDeleteTarget(null);

    // Optimistic remove
    setJobs(prev => prev.filter(j => j.uploadKey !== key));

    try {
      await fetch(`/api/lectures/${encodeURIComponent(key)}`, { method: "DELETE" });
    } catch {
      fetchJobs(); // revert on failure
    }
  };

  // ── Upload ──
  const handleUpload = async (file: File, course: string) => {
    setUploading(true);
    setUploadError("");
    try {
      const hashBuffer = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
      const ext = file.name.split(".").pop();
      const key = file.name;
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: key, contentType: file.type || "application/octet-stream" }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { url } = await res.json();
      const upload = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!upload.ok) throw new Error("Upload failed");
      router.push(`/processing?key=${encodeURIComponent(key)}&course=${encodeURIComponent(course)}`);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  };

  // ── Derived state ──
  const enrichedCourses = courses.map(c => ({
    ...c,
    lectureCount: jobs.filter(j => j.course === c.id).length,
  }));

  const filtered = jobs.filter(j => {
    const name = (j.fileName ?? j.uploadKey).toLowerCase();
    return (
      name.includes(search.toLowerCase()) &&
      (courseFilter === "all" || j.course === courseFilter)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          name={(deleteTarget.fileName ?? deleteTarget.uploadKey).replace(/^[a-z0-9]+-\d+-/, "").replace(/\.[^.]+$/, "")}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Lecsum</span>
          </div>
          <nav className="flex items-center gap-1">
            <span className="text-sm font-medium text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg">Dashboard</span>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Lectures</h1>
          <p className="text-sm text-gray-500 mt-0.5">Drag cards onto a course to assign, or onto the trash to delete.</p>
        </div>

        <div className="mb-6">
          <StatsBar jobs={jobs} />
        </div>

        <div className="grid grid-cols-[1fr_260px] gap-6">
          {/* ── Main grid ── */}
          <div className="min-w-0">
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search lectures..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={courseFilter}
                onChange={e => setCourseFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Courses</option>
                <option value="">Unassigned</option>
                {enrichedCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-24 animate-pulse">
                    <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                    <div className="h-2 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-sm text-gray-500">
                  {search || courseFilter !== "all" ? "No lectures match your filters." : "No lectures yet — upload one to get started."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map(job => (
                  <LectureCard
                    key={job.uploadKey}
                    job={job}
                    courses={enrichedCourses}
                    onDragStart={handleDragStart}
                    onClick={() => router.push(`/study?key=${encodeURIComponent(job.transcriptKey ?? "")}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            <UploadZone onUpload={handleUpload} courses={enrichedCourses} />

            {uploading && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">Uploading…</div>
            )}
            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{uploadError}</div>
            )}

            {/* Courses drop targets */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Courses</h2>
                <button onClick={() => setAddingCourse(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add</button>
              </div>

              <div className="space-y-1">
                {enrichedCourses.length === 0 && !addingCourse && (
                  <p className="text-xs text-gray-400 text-center py-3">No courses yet</p>
                )}
                {enrichedCourses.map(c => (
                  <CourseDropTarget
                    key={c.id}
                    course={c}
                    lectureCount={c.lectureCount}
                    onDrop={handleDropOnCourse}
                    onRemove={removeCourse}
                  />
                ))}
                {addingCourse && (
                  <div className="flex gap-2 mt-2 px-1">
                    <input
                      autoFocus
                      value={newCourseName}
                      onChange={e => setNewCourseName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addCourse(); if (e.key === "Escape") setAddingCourse(false); }}
                      placeholder="Course name..."
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={addCourse} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">Add</button>
                  </div>
                )}
              </div>
            </div>

            {/* Trash drop target */}
            <TrashZone onDrop={handleDropOnTrash} />
          </div>
        </div>
      </div>
    </div>
  );
}