"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Job, Course, BubblePos, COURSE_COLORS, cleanName } from "./components/types";
import { BubblePanel } from "./components/BubblePanel";
import { CourseCard } from "./components/CourseCard";
import { LectureCard } from "./components/LectureCard";
import { TrashZone } from "./components/TrashZone";
import { UploadZone } from "./components/UploadZone";
import { StatsBar } from "./components/StatsBar";
import { CourseManager } from "./components/CourseManager";
import { DeleteModal } from "./components/DeleteModal";
import { PolicyErrorModal } from "./components/PolicyErrorModal";

import {
  BadgeCheckIcon, BellIcon, CreditCardIcon, LogOutIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function AccountMenu({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full h-8 w-8 flex items-center justify-center outline-none cursor-pointer">
        <Avatar className="h-12 w-12">
          <AvatarImage src="https://github.com/shadcn.png" alt="VD" />
          <AvatarFallback className="text-[10px] bg-gradient-to-br from-green-400 to-green-700 text-white border-0">
            VD
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        className={isDark ? "bg-[#0d1512] border-white/10 text-white" : ""}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem className={isDark ? "focus:bg-white/8 focus:text-white text-white/70" : ""}>
            <BadgeCheckIcon className="mr-2 h-4 w-4" />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem className={isDark ? "focus:bg-white/8 focus:text-white text-white/70" : ""}>
            <CreditCardIcon className="mr-2 h-4 w-4" />
            Billing
          </DropdownMenuItem>
          <DropdownMenuItem className={isDark ? "focus:bg-white/8 focus:text-white text-white/70" : ""}>
            <BellIcon className="mr-2 h-4 w-4" />
            Notifications
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className={isDark ? "bg-white/8" : ""} />

        {/* Dark mode toggle */}
        <DropdownMenuItem
          onClick={onToggleTheme}
          className={isDark ? "focus:bg-white/8 focus:text-white text-white/70" : ""}
        >
          {isDark
            ? <><svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>Light mode</>
            : <><svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>Dark mode</>
          }
        </DropdownMenuItem>

        <DropdownMenuSeparator className={isDark ? "bg-white/8" : ""} />
        <DropdownMenuItem className={isDark ? "focus:bg-white/8 focus:text-red-400 text-white/70" : "focus:text-red-600"}>
          <LogOutIcon className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  // ── Data state ──
  const [jobs, setJobs] = useState<Job[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // ── UI state ──
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [isDark, setIsDark] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [addingCourse, setAddingCourse] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);

  // ── Bubble state ──
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [bubblePos, setBubblePos] = useState<BubblePos | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const mainRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingKey = useRef<string | null>(null);
  const draggingCourseId = useRef<string | null>(null);

  // ── Fetch courses ──
  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/courses");
      if (!res.ok) return;
      const data = await res.json();
      setCourses(data.courses ?? []);
    } catch { }
  }, []);

  useEffect(() => {
    fetchCourses();
    const theme = localStorage.getItem("lecsum-theme");
    const dark = theme !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
}, [fetchCourses]);

  // ── Fetch jobs ──
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/lectures");
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.lectures ?? []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchJobs();
    const iv = setInterval(fetchJobs, 10000);
    return () => clearInterval(iv);
  }, [fetchJobs]);

  // ── Theme ──
  const toggleTheme = () => {
  const next = !isDark;

  const applyTheme = () => {
    setIsDark(next);
    localStorage.setItem("lecsum-theme", next ? "dark" : "light");
    // apply class to html element so CSS can target it
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.classList.toggle("light", !next);
  };

  if (!document.startViewTransition) {
    applyTheme();
    return;
  }

  document.startViewTransition(applyTheme);
};

  // ── Courses ──
  const saveCourses = async (updated: Course[]) => {
    setCourses(updated);
    try {
      await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courses: updated }),
      });
    } catch { fetchCourses(); }
  };

  const addCourse = async () => {
    if (!newCourseName.trim()) return;
    const course: Course = {
      id: Date.now().toString(),
      name: newCourseName.trim(),
      color: COURSE_COLORS[courses.length % COURSE_COLORS.length],
      lectureCount: 0,
    };
    await saveCourses([...courses, course]);
    setNewCourseName(""); setAddingCourse(false);
  };

  const renameCourse = async (id: string, name: string) => {
    await saveCourses(courses.map(c => c.id === id ? { ...c, name } : c));
  };

  const removeCourse = async (id: string) => {
    await saveCourses(courses.filter(c => c.id !== id));
  };

  const handleReorderCourse = async (dragId: string, dropId: string) => {
    const from = courses.findIndex(c => c.id === dragId);
    const to = courses.findIndex(c => c.id === dropId);
    if (from === -1 || to === -1) return;
    const reordered = [...courses];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    await saveCourses(reordered);
  };

  // ── Lectures ──
  const renameLecture = async (uploadKey: string, displayName: string) => {
    setJobs(prev => prev.map(j => j.uploadKey === uploadKey ? { ...j, displayName } : j));
    try {
      await fetch(`/api/lectures/${encodeURIComponent(uploadKey)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
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

  // ── Bubble ──
  const calcBubblePos = (courseId: string): BubblePos | null => {
    const cardEl = cardRefs.current.get(courseId);
    const mainEl = mainRef.current;
    if (!cardEl || !mainEl) return null;
    const cr = cardEl.getBoundingClientRect();
    const mr = mainEl.getBoundingClientRect();
    const idx = enrichedCourses.findIndex(c => c.id === courseId);
    const col = idx % 3;
    const bw = 240, bh = 260, gap = 14;
    let left: number, arrowSide: "left" | "right", transformOrigin: string;
    if (col < 2) {
      left = cr.right - mr.left + gap; arrowSide = "left"; transformOrigin = "left center";
    } else {
      left = cr.left - mr.left - bw - gap; arrowSide = "right"; transformOrigin = "right center";
    }
    return { top: Math.max(8, cr.top - mr.top + cr.height / 2 - bh / 2), left, arrowSide, transformOrigin };
  };

  const openBubble = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openCourseId === courseId) { closeBubble(); return; }
    if (openCourseId) {
      setIsClosing(true);
      setTimeout(() => { setIsClosing(false); setOpenCourseId(courseId); setBubblePos(calcBubblePos(courseId)); }, 80);
    } else {
      setOpenCourseId(courseId); setBubblePos(calcBubblePos(courseId));
    }
  };

  const closeBubble = () => {
    setIsClosing(true);
    closeTimer.current = setTimeout(() => { setOpenCourseId(null); setIsClosing(false); setBubblePos(null); }, 240);
  };

  // ── Upload ──
  const handleUpload = async (file: File, course: string) => {
    setUploading(true); setUploadError("");
    try {
      const key = file.name;
      const hashBuffer = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
      const res = await fetch("/api/upload-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: key, contentType: file.type || "application/octet-stream", hash }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { url } = await res.json();
      const up = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } });
      if (!up.ok) throw new Error("Upload failed");

      const optimisticJob: Job = {
        uploadKey: key, fileName: key, displayName: cleanName(key),
        status: "transcribing", createdAt: new Date().toISOString(), course: course || undefined,
      };
      setJobs(prev => [optimisticJob, ...prev]);

      const docFormats = new Set(["pdf", "jpg", "jpeg", "png", "tiff"]);
      const ext = key.split(".").pop()?.toLowerCase() ?? "";
      if (docFormats.has(ext)) {
        fetch("/api/extract", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadKey: key }),
        }).then(async r => {
          if (!r.ok) {
            const data = await r.json();
            setJobs(prev => prev.map(j => j.uploadKey === key ? { ...j, status: "error" } : j));
            setPolicyError(data.error ?? "This file could not be processed.");
          }
        }).catch(() => {
          setJobs(prev => prev.map(j => j.uploadKey === key ? { ...j, status: "error" } : j));
        });
      }
      setUploading(false);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
      setUploading(false);
    }
  };

  // ── Derived ──
  const enrichedCourses = courses.map(c => ({ ...c, lectureCount: jobs.filter(j => j.course === c.id).length }));
  const openCourse = enrichedCourses.find(c => c.id === openCourseId) ?? null;
  const filtered = (
    courseFilter === "all" ? jobs :
    courseFilter === "" ? jobs.filter(j => !j.course) :
    jobs.filter(j => j.course === courseFilter)
  ).filter(j => (j.displayName ?? cleanName(j.fileName ?? j.uploadKey)).toLowerCase().includes(search.toLowerCase()));

  // ── Theme tokens ──
  const T = isDark ? {
    bg: "bg-[#0d1512]", text: "text-white", textMuted: "text-white/50", textFaint: "text-white/25",
    rail: "bg-black/40 border-white/8", railIcon: "text-white/40 hover:text-white hover:bg-white/8",
    railActive: "text-green-400 bg-white/10",
    surface: "bg-white/[0.04] border-white/10",
    input: "bg-white/[0.04] border-white/10 text-white placeholder-white/25 focus:border-white/25",
    sidebar: "bg-black/35 border-white/8", statBox: "bg-white/[0.04] border-white/10",
    toggleTrack: "bg-white/10", toggleThumb: "translate-x-0 bg-white/60",
    searchBox: "bg-white/[0.04] border-white/10 text-white/50",
    kbd: "bg-white/8 border-white/10 text-white/25",
    tab: "bg-transparent border-white/8 text-white/40 hover:text-white/70 hover:border-white/15",
    tabActive: "bg-white/12 border-white/20 text-white",
  } : {
    bg: "bg-[#eef3f0]", text: "text-gray-900", textMuted: "text-gray-500", textFaint: "text-gray-400",
    rail: "bg-white/70 border-black/8", railIcon: "text-black/40 hover:text-black/80 hover:bg-black/5",
    railActive: "text-green-700 bg-black/7",
    surface: "bg-white/60 border-black/8",
    input: "bg-white/60 border-black/10 text-gray-800 placeholder-gray-400 focus:border-black/20",
    sidebar: "bg-white/50 border-black/8", statBox: "bg-white/60 border-black/8",
    toggleTrack: "bg-green-400/30", toggleThumb: "translate-x-4 bg-green-600",
    searchBox: "bg-white/60 border-black/10 text-gray-500",
    kbd: "bg-black/6 border-black/10 text-gray-400",
    tab: "bg-transparent border-black/8 text-gray-400 hover:text-gray-700",
    tabActive: "bg-black/8 border-black/12 text-gray-900",
  };

  const navigateToStudy = (job: Job) => {
    const ext = (job.fileName ?? job.uploadKey).split(".").pop()?.toLowerCase() ?? "";
    router.push(
      `/study?key=${encodeURIComponent(job.transcriptKey ?? "")}` +
      `&course=${encodeURIComponent(job.course ?? "")}` +
      `&color=${encodeURIComponent(enrichedCourses.find(c => c.id === job.course)?.color ?? "#4ade80")}` +
      `&name=${encodeURIComponent(job.displayName ?? cleanName(job.fileName ?? job.uploadKey))}` +
      `&ext=${encodeURIComponent(ext)}`
    );
  };

  return (
    <div className={`min-h-screen overflow-hidden ${T.bg} ${T.text}`} onClick={() => openCourseId && closeBubble()}>
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute w-[480px] h-[480px] -top-28 -left-20 rounded-full blur-[90px] opacity-60 ${isDark ? "bg-[radial-gradient(circle,#0d3d26_0%,transparent_70%)]" : "bg-[radial-gradient(circle,#c8e6d4_0%,transparent_70%)]"}`} />
        <div className={`absolute w-[560px] h-[560px] top-20 -right-40 rounded-full blur-[90px] opacity-60 ${isDark ? "bg-[radial-gradient(circle,#0a2a3a_0%,transparent_70%)]" : "bg-[radial-gradient(circle,#c5ddf0_0%,transparent_70%)]"}`} />
        <div className={`absolute w-[380px] h-[380px] -bottom-16 left-44 rounded-full blur-[90px] opacity-60 ${isDark ? "bg-[radial-gradient(circle,#1a1040_0%,transparent_70%)]" : "bg-[radial-gradient(circle,#d5cef5_0%,transparent_70%)]"}`} />
        <div
          className={`absolute inset-0 ${isDark ? "opacity-[0.07]" : "opacity-[0.06]"}`}
          style={{
            backgroundImage: `linear-gradient(${isDark ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)"} 1px,transparent 1px),linear-gradient(90deg,${isDark ? "rgba(255,255,255,1)" : "rgba(0,0,0,1)"} 1px,transparent 1px)`,
            backgroundSize: "44px 44px",
          }}
        />
      </div>
        <div className="fixed bottom-5 left-4 z-50">
          <AccountMenu isDark={isDark} onToggleTheme={toggleTheme} />
      </div>
      <div className="relative z-10 flex min-h-screen">
        {/* Main */}
        <div ref={mainRef} className="flex-1 min-w-0 p-5 overflow-hidden relative">
          {/* Topbar */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl" style={{ fontFamily: "'DM Serif Display',serif", letterSpacing: "-0.5px" }}>Dashboard</h1>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 border rounded-xl px-3 py-2 backdrop-blur-md ${T.searchBox}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className={`bg-transparent outline-none text-xs w-28 ${T.textMuted}`} />
                <span className={`text-[9px] font-mono border rounded px-1 py-0.5 ${T.kbd}`}>Ctrl+K</span>
              </div>
            </div>
          </div>
          

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {[{ id: "all", label: "All" }, { id: "", label: "Unassigned" }, ...enrichedCourses.map(c => ({ id: c.id, label: c.name }))].map(f => (
              <button key={f.id} onClick={() => setCourseFilter(f.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap flex-shrink-0 ${courseFilter === f.id ? T.tabActive : T.tab}`}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Stats */}
          <StatsBar jobs={jobs} statBox={T.statBox} textFaint={T.textFaint} />

          {/* Course cards */}
          {enrichedCourses.length > 0 && (
            <>
              <div className={`text-[9px] uppercase tracking-widest mb-2 ${T.textFaint}`}>Courses</div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {enrichedCourses.map(c => (
                  <CourseCard
                    key={c.id}
                    course={c}
                    isOpen={openCourseId === c.id}
                    cardRef={el => { if (el) cardRefs.current.set(c.id, el); else cardRefs.current.delete(c.id); }}
                    onClick={e => openBubble(c.id, e)}
                    onRename={renameCourse}
                    onRemove={removeCourse}
                    jobs={jobs}
                    onDropLecture={handleDropOnCourse}
                    onReorder={handleReorderCourse}
                    draggingCourseId={draggingCourseId}
                    isDark={isDark}
                  />
                ))}
              </div>
            </>
          )}

          {/* Bubble panel */}
          <BubblePanel
            course={openCourse}
            jobs={jobs}
            pos={bubblePos}
            isOpen={!!openCourseId && !isClosing}
            isClosing={isClosing}
            onClose={closeBubble}
            onClickLecture={job => { closeBubble(); navigateToStudy(job); }}
          />

          {/* Lecture grid label */}
          <div className={`text-[9px] uppercase tracking-widest mb-2 ${T.textFaint}`}>
            {courseFilter === "all" ? "All lectures" : courseFilter === "" ? "Unassigned" : enrichedCourses.find(c => c.id === courseFilter)?.name ?? "Lectures"}
          </div>

          {/* Lecture grid */}
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => <div key={i} className={`rounded-xl border h-20 animate-pulse ${T.statBox}`} />)}
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
                  isDark={isDark}
                  onDragStart={handleDragStart}
                  onRename={renameLecture}
                  onClick={() => navigateToStudy(job)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={`w-64 flex-shrink-0 border-l backdrop-blur-2xl flex flex-col gap-3 p-4 ${T.sidebar}`} onClick={e => e.stopPropagation()}>
          <UploadZone
            courses={enrichedCourses}
            selectedCourse={selectedCourse}
            onSelectCourse={setSelectedCourse}
            onUpload={handleUpload}
            uploading={uploading}
            uploadError={uploadError}
            isDark={isDark}
          />
          <CourseManager
            courses={enrichedCourses}
            addingCourse={addingCourse}
            newCourseName={newCourseName}
            onSetAdding={setAddingCourse}
            onSetNewName={setNewCourseName}
            onAdd={addCourse}
            onDropLecture={handleDropOnCourse}
            isDark={isDark}
          />
          <TrashZone onDrop={handleDropOnTrash} isDark={isDark} />
        </div>
      </div>

      {/* Modals */}
      {deleteTarget && (
        <DeleteModal
          name={deleteTarget.displayName ?? cleanName(deleteTarget.fileName ?? deleteTarget.uploadKey)}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {policyError && (
        <PolicyErrorModal
          error={policyError}
          onDismiss={() => setPolicyError(null)}
          onRemove={() => {
            setPolicyError(null);
            const erroredJob = jobs.find(j => j.status === "error");
            if (erroredJob) {
              setJobs(prev => prev.filter(j => j.uploadKey !== erroredJob.uploadKey));
              fetch(`/api/lectures/${encodeURIComponent(erroredJob.uploadKey)}`, { method: "DELETE" }).catch(() => {});
            }
          }}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
        .glass-card {
          background: ${isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)"};
          border: 1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"};
          backdrop-filter: blur(16px);
        }
      `}</style>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');

        .glass-card {
          background: ${isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.6)"};
          border: 1px solid ${isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"};
          backdrop-filter: blur(16px);
        }

        /* ── Theme transition — radial reveal from bottom-left ── */
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation: none;
          mix-blend-mode: normal;
        }

        ::view-transition-new(root) {
          clip-path: circle(0% at 0% 100%);
          animation: theme-reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes theme-reveal {
          from { clip-path: circle(0% at 0% 100%); }
          to   { clip-path: circle(150% at 0% 100%); }
        }
      `}</style>
    </div>
  );
}