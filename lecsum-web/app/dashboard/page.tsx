"use client";

import { useState, useEffect, useCallback } from "react";
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
    uploaded: "bg-amber-50 text-amber-700 border border-amber-200",
    error: "bg-red-50 text-red-700 border border-red-200",
    pending: "bg-gray-50 text-gray-500 border border-gray-200",
  };
  const labels: Record<string, string> = {
    done: "Ready",
    transcribing: "Processing",
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


function UploadZone({ onUpload }: { onUpload: (file: File, course: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("lecsum-courses");
    if (saved) setCourses(JSON.parse(saved));
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file, selectedCourse);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file, selectedCourse);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">New Lecture</h2>
        <select
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
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
        }`}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${dragging ? "bg-blue-100" : "bg-gray-100"}`}>
          <svg className={`w-5 h-5 ${dragging ? "text-blue-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">Drop files here</p>
        </div>
        <input type="file" accept=".mp3,.wav,.m4a,.flac" className="hidden" onChange={handleFile} />
      </label>
    </div>
  );
}

function CourseManager({ onCoursesChange }: { onCoursesChange: (courses: Course[]) => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lecsum-courses");
    if (saved) {
      const parsed = JSON.parse(saved);
      setCourses(parsed);
      onCoursesChange(parsed);
    }
  }, []);

  const addCourse = () => {
    if (!newName.trim()) return;
    const course: Course = {
      id: Date.now().toString(),
      name: newName.trim(),
      color: COURSE_COLORS[courses.length % COURSE_COLORS.length],
      lectureCount: 0,
    };
    const updated = [...courses, course];
    setCourses(updated);
    onCoursesChange(updated);
    localStorage.setItem("lecsum-courses", JSON.stringify(updated));
    setNewName("");
    setAdding(false);
  };

  const removeCourse = (id: string) => {
    const updated = courses.filter(c => c.id !== id);
    setCourses(updated);
    onCoursesChange(updated);
    localStorage.setItem("lecsum-courses", JSON.stringify(updated));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Courses</h2>
        <button onClick={() => setAdding(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add</button>
      </div>
      <div className="space-y-2">
        {courses.length === 0 && !adding && (
          <p className="text-xs text-gray-400 text-center py-3">No courses yet</p>
        )}
        {courses.map(c => (
          <div key={c.id} className="flex items-center gap-2.5 group">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
            <span className="text-sm text-gray-700 flex-1 truncate">{c.name}</span>
            <span className="text-xs text-gray-400">{c.lectureCount}</span>
            <button
              onClick={() => removeCourse(c.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity text-xs"
            >✕</button>
          </div>
        ))}
        {adding && (
          <div className="flex gap-2 mt-2">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addCourse(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Course name..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={addCourse} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">Add</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsBar({ jobs }: { jobs: Job[] }) {
  const total = jobs.length;
  const ready = jobs.filter(j => j.status === "done").length;
  const processing = jobs.filter(j => j.status === "transcribing" || j.status === "uploaded").length;

  const stats = [
    { label: "Total Lectures", value: total },
    { label: "Ready to Study", value: ready },
    { label: "Processing", value: processing },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-2xl border border-gray-200 px-5 py-4 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function LectureCard({ job, courses, onClick }: { job: Job; courses: Course[]; onClick: () => void }) {
  const course = courses.find(c => c.id === job.course);
  const rawName = job.fileName ?? job.uploadKey;
  const name = rawName.replace(/^[a-z0-9]+-\d+-/, "").replace(/\.[^.]+$/, "");
  return (
    <div
      onClick={job.status === "done" ? onClick : undefined}
      className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm transition-all ${
        job.status === "done" ? "hover:border-blue-300 hover:shadow-md cursor-pointer" : "opacity-70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {course && (
              <span className="text-xs flex items-center gap-1 text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: course.color }} />
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

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

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

  const handleUpload = async (file: File, course: string) => {
    setUploading(true);
    setUploadError("");
    try {
      const uid = `${Math.random().toString(36).slice(2)}-${Date.now()}`;
      const key = `${uid}-${file.name}`;
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: key, contentType: file.type || "audio/mpeg" }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { url } = await res.json();
      const upload = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "audio/mpeg" },
      });
      if (!upload.ok) throw new Error("Upload failed");
      router.push(`/processing?key=${encodeURIComponent(key)}&course=${encodeURIComponent(course)}`);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  };

  const filtered = jobs.filter(j => {
    const name = (j.fileName ?? j.uploadKey).toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchCourse = courseFilter === "all" || j.course === courseFilter;
    return matchSearch && matchCourse;
  });

  // Enrich courses with lecture counts
  const enrichedCourses = courses.map(c => ({
    ...c,
    lectureCount: jobs.filter(j => j.course === c.id).length,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
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
            <a href="/" className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">Upload</a>
            <span className="text-sm font-medium text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg">Dashboard</span>
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Lectures</h1>
          <p className="text-sm text-gray-500 mt-1">Upload, organize, and study your lecture recordings.</p>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <StatsBar jobs={jobs} />
        </div>

        <div className="grid grid-cols-[1fr_280px] gap-6">
          {/* Main content */}
          <div className="min-w-0">
            {/* Search + filter bar */}
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
                {enrichedCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Lecture grid */}
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
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                </div>
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
                    onClick={() => router.push(`/study?key=${encodeURIComponent(job.transcriptKey ?? "")}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <UploadZone onUpload={handleUpload} />
            {uploading && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                Uploading…
              </div>
            )}
            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {uploadError}
              </div>
            )}
            <CourseManager onCoursesChange={setCourses} />
          </div>
        </div>
      </div>
    </div>
  );
}