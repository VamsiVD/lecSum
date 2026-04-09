"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

interface Summary {
  tldr: string;
  key_concepts: string[];
  summary: string;
  topics: string[];
}
interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}
interface Flashcard {
  term: string;
  definition: string;
}


const conceptSymbols = ["⬡", "◈", "⟁", "◉", "⬟", "◎"];

function Spinner({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div
        className="w-6 h-6 rounded-full border-2 animate-spin"
        style={{ borderColor: `${color}33`, borderTopColor: color }}
      />
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SummaryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function FlashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
    </svg>
  );
}

function TranscriptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
    </svg>
  );
}

function SummaryTab({ transcriptKey, color }: { transcriptKey: string; color: string }) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/summary?key=${encodeURIComponent(transcriptKey)}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [transcriptKey]);

  if (loading) return <Spinner color={color} />;
  if (error) return <p style={{ color: "#f87171", textAlign: "center", padding: "2rem 0", fontSize: "0.875rem" }}>{error}</p>;
  if (!data) return null;

  const paragraphs = typeof data.summary === "string"
    ? data.summary.split(/\n\n+/).filter(Boolean)
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4.5rem" }}>
      {/* TLDR */}
      <section>
        <div style={{ position: "relative", borderRadius: "1rem", background: `${color}08`, border: `1px solid ${color}30`, borderLeft: `4px solid ${color}`, padding: "2.25rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${color}20`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BulbIcon />
            </div>
            <div>
              <p style={{ fontSize: "0.625rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.2em", color, marginBottom: "0.5rem" }}>TLDR</p>
              <p style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "rgba(255,255,255,0.9)", fontFamily: "'DM Serif Display',serif" }}>{data.tldr}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Key concepts bento */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h4 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#fff", fontFamily: "'DM Serif Display',serif" }}>Key Concepts</h4>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "1rem" }}>
          {(data.key_concepts ?? []).map((c, i) => (
            <div key={i} style={{ padding: "1.25rem", borderRadius: "0.75rem", background: "rgba(255,255,255,0.03)", border: `1px solid ${color}20`, borderBottom: `2px solid ${color}40`, cursor: "default" }}>
              <div style={{ fontSize: "1.5rem", color, marginBottom: "0.75rem", lineHeight: 1 }}>{conceptSymbols[i % conceptSymbols.length]}</div>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.9)", lineHeight: 1.4 }}>{c}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Long-form */}
      <section style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        {paragraphs.map((para, i) => (
          <div key={i} style={{ paddingLeft: "2.5rem", position: "relative", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ position: "absolute", left: -5, top: 6, width: 10, height: 10, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}99` }} />
            <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.75, fontSize: "0.875rem" }}>{para}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function QuizTab({ transcriptKey, color }: { transcriptKey: string; color: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    fetch(`/api/quiz?key=${encodeURIComponent(transcriptKey)}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setQuestions(d.questions ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [transcriptKey]);

  if (loading) return <Spinner color={color} />;
  if (error) return <p style={{ color: "#f87171", textAlign: "center", padding: "2rem", fontSize: "0.875rem" }}>{error}</p>;
  if (questions.length === 0) return null;

  if (showResult) {
    const score = Object.entries(answered).filter(([i, a]) => questions[+i]?.correct === a).length;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 0", gap: "1.25rem" }}>
        <div style={{ fontSize: "4rem", fontFamily: "'DM Serif Display',serif", color }}>{score}/{questions.length}</div>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>{score === questions.length ? "Perfect score!" : score >= questions.length / 2 ? "Good work!" : "Keep studying!"}</p>
        <button onClick={() => { setCurrent(0); setSelected(null); setAnswered({}); setShowResult(false); }}
          style={{ padding: "0.625rem 1.5rem", borderRadius: "0.75rem", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", background: `${color}20`, color, border: `1px solid ${color}40` }}>
          Try again
        </button>
      </div>
    );
  }

  const q = questions[current];
  const isAnswered = selected !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ flex: 1, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ height: "100%", borderRadius: 99, background: color, width: `${(current / questions.length) * 100}%`, transition: "width .5s ease" }} />
        </div>
        <span style={{ fontSize: "0.625rem", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>{current + 1}/{questions.length}</span>
      </div>

      {/* Question card */}
      <div style={{ padding: "1.5rem", borderRadius: "1rem", background: `${color}06`, border: `1px solid ${color}20` }}>
        <p style={{ fontSize: "0.625rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.2em", color, marginBottom: "0.75rem" }}>Question {current + 1}</p>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "1rem", lineHeight: 1.6, fontFamily: "'DM Serif Display',serif" }}>{q.question}</p>
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {q.options.map((opt, i) => {
          let bg = "rgba(255,255,255,0.03)";
          let border = "rgba(255,255,255,0.1)";
          let clr = "rgba(255,255,255,0.75)";
          if (isAnswered) {
            if (i === q.correct) { bg = "rgba(7, 142, 142,0.12)"; border = "#71f871"; clr = "#71f871"; }
            else if (i === selected) { bg = "rgba(248,113,113,0.12)"; border = "#f87171"; clr = "#f87171"; }
          }
          return (
            <button key={i} disabled={isAnswered} onClick={() => { setSelected(i); setAnswered(prev => ({ ...prev, [current]: i })); }}
              style={{ textAlign: "left", padding: "0.875rem 1.25rem", borderRadius: "0.75rem", border: `1px solid ${border}`, background: bg, color: clr, fontSize: "0.875rem", cursor: isAnswered ? "default" : "pointer", transition: "all .15s" }}>
              <span style={{ fontFamily: "monospace", fontSize: "0.625rem", marginRight: "0.75rem", opacity: 0.5 }}>{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div style={{ padding: "1rem", borderRadius: "0.75rem", fontSize: "0.8125rem", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Explanation: </span>{q.explanation}
        </div>
      )}

      {isAnswered && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {current < questions.length - 1 ? (
            <button onClick={() => { setCurrent(c => c + 1); setSelected(null); }}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "0.75rem", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", background: `${color}20`, color, border: `1px solid ${color}40` }}>
              Next →
            </button>
          ) : (
            <button onClick={() => setShowResult(true)}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "0.75rem", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", background: color, color: "#000", border: "none" }}>
              See results
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FlashcardsTab({ transcriptKey, color }: { transcriptKey: string; color: string }) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch(`/api/flashcards?key=${encodeURIComponent(transcriptKey)}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setCards(d.flashcards ?? []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [transcriptKey]);

  if (loading) return <Spinner color={color} />;
  if (error) return <p style={{ color: "#f87171", textAlign: "center", padding: "2rem", fontSize: "0.875rem" }}>{error}</p>;
  if (cards.length === 0) return null;

  const card = cards[idx];
  const progress = Math.round((known.size / cards.length) * 100);

  const next = (markKnown: boolean) => {
    if (markKnown) setKnown(prev => new Set([...prev, idx]));
    setFlipped(false);
    setTimeout(() => setIdx(i => Math.min(i + 1, cards.length - 1)), 120);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ flex: 1, height: 3, borderRadius: 99, background: "rgba(255,255,255,0.08)" }}>
          <div style={{ height: "100%", borderRadius: 99, background: color, width: `${progress}%`, transition: "width .7s ease" }} />
        </div>
        <span style={{ fontSize: "0.625rem", fontFamily: "monospace", color: "rgba(255,255,255,0.3)" }}>{known.size}/{cards.length} known</span>
      </div>

      <div onClick={() => setFlipped(f => !f)}
        style={{ borderRadius: "1rem", border: `1px solid ${flipped ? `${color}40` : "rgba(255,255,255,0.1)"}`, background: flipped ? `${color}10` : "rgba(255,255,255,0.03)", padding: "3rem 2rem", minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all .25s" }}>
        <p style={{ fontSize: "0.625rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.2em", color: flipped ? color : "rgba(255,255,255,0.2)", marginBottom: "1.25rem" }}>
          {flipped ? "Definition" : "Term — click to flip"}
        </p>
        <p style={{ textAlign: "center", lineHeight: 1.6, fontSize: flipped ? "0.875rem" : "1.25rem", color: flipped ? "rgba(255,255,255,0.75)" : "#fff", fontFamily: flipped ? "sans-serif" : "'DM Serif Display',serif", transition: "all .25s" }}>
          {flipped ? card.definition : card.term}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => { setFlipped(false); setTimeout(() => setIdx(i => Math.max(i - 1, 0)), 120); }} disabled={idx === 0}
          style={{ padding: "0.5rem 1rem", borderRadius: "0.625rem", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.3 : 1, background: "transparent" }}>
          ← Prev
        </button>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => next(false)} disabled={idx === cards.length - 1}
            style={{ padding: "0.5rem 1rem", borderRadius: "0.625rem", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", background: "rgba(248,113,113,0.06)", fontSize: "0.75rem", cursor: "pointer", opacity: idx === cards.length - 1 ? 0.3 : 1 }}>
            Again
          </button>
          <button onClick={() => next(true)} disabled={idx === cards.length - 1}
            style={{ padding: "0.5rem 1rem", borderRadius: "0.625rem", border: `1px solid ${color}40`, color, background: `${color}10`, fontSize: "0.75rem", cursor: "pointer", opacity: idx === cards.length - 1 ? 0.3 : 1 }}>
            Got it ✓
          </button>
        </div>
        <button onClick={() => { setFlipped(false); setTimeout(() => setIdx(i => Math.min(i + 1, cards.length - 1)), 120); }} disabled={idx === cards.length - 1}
          style={{ padding: "0.5rem 1rem", borderRadius: "0.625rem", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", cursor: idx === cards.length - 1 ? "not-allowed" : "pointer", opacity: idx === cards.length - 1 ? 0.3 : 1, background: "transparent" }}>
          Next →
        </button>
      </div>
    </div>
  );
}

function TranscriptTab({ transcriptKey, color }: { transcriptKey: string; color: string }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/transcript?key=${encodeURIComponent(transcriptKey)}`)
      .then(r => r.json())
      .then(d => {
        setText(d.transcript ?? d.text ?? d.content ?? "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [transcriptKey]);

  if (loading) return <Spinner color={color} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* search bar — same as before */}
      <div style={{ position: "relative" }}>
        <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "rgba(255,255,255,0.25)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transcript…"
          style={{ width: "100%", paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10, borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", outline: "none" }} />
      </div>

      {/* markdown content */}
      <div style={{ padding: "1.5rem 1.75rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", maxHeight: "65vh", overflowY: "auto" }}>
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.85, fontSize: "0.9375rem", marginBottom: "1.25rem" }}>{children}</p>
            ),
            h1: ({ children }) => (
              <h1 style={{ color: "#fff", fontSize: "1.25rem", fontFamily: "'DM Serif Display',serif", marginBottom: "0.75rem", marginTop: "1.5rem" }}>{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 style={{ color: "#fff", fontSize: "1.1rem", fontFamily: "'DM Serif Display',serif", marginBottom: "0.5rem", marginTop: "1.25rem" }}>{children}</h2>
            ),
            strong: ({ children }) => (
              <strong style={{ color, fontWeight: 600 }}>{children}</strong>
            ),
            em: ({ children }) => (
              <em style={{ color: "rgba(255,255,255,0.5)" }}>{children}</em>
            ),
            li: ({ children }) => (
              <li style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: "0.375rem", fontSize: "0.9375rem" }}>{children}</li>
            ),
            ul: ({ children }) => (
              <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>{children}</ul>
            ),
            blockquote: ({ children }) => (
              <blockquote style={{ borderLeft: `3px solid ${color}`, paddingLeft: "1rem", color: "rgba(255,255,255,0.45)", margin: "1rem 0" }}>{children}</blockquote>
            ),
          }}
        >
          {search
            ? text.replace(new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "**$1**")
            : text}
        </ReactMarkdown>
      </div>
    </div>
  );
}

type Tab = "summary" | "quiz" | "flashcards" | "transcript";

function StudyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transcriptKey = searchParams.get("key") ?? "";
  const courseId = searchParams.get("course") ?? "";
  const nameParam = searchParams.get("name");
  const rawName = nameParam
    ?? transcriptKey.replace(/\.[^.]+$/, "").replace(/^lecsum-job-[a-z0-9]+-?/, "").replace(/[-_]/g, " ").trim();
  const lectureTitle = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const extParam = searchParams.get("ext")?.toLowerCase() ?? "";
  const isAudio = ["mp3", "wav", "m4a", "flac", "ogg", "webm", "amr"].includes(extParam);
  const colorParam = searchParams.get("color");
  const [color, setColor] = useState(colorParam ?? "#4ade80");
  const [tab, setTab] = useState<Tab>("summary");

  const tabs: { id: Tab; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: "summary", label: "Summary", icon: <SummaryIcon /> },
    { id: "quiz", label: "Quiz", icon: <QuizIcon /> },
    { id: "flashcards", label: "Flashcards", icon: <FlashIcon /> },
    { id: "transcript", label: "Transcript", icon: <TranscriptIcon />, disabled: !isAudio },
  ];

  useEffect(() => {
    if (colorParam) setColor(colorParam);
  }, [colorParam]);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e14", color: "#f1f3fc", fontFamily: "'DM Sans',sans-serif" }}>
    {/* Background */}
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(${color}0d 1px,transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div style={{ position: "absolute", top: 0, left: 240, right: 0, height: 400, background: `radial-gradient(circle at 50% 0%,${color}14 0%,transparent 70%)` }} />
    </div>

      {/* Sidebar */}
      <nav style={{ position: "fixed", left: 0, top: 0, height: "100%", width: 240, display: "flex", flexDirection: "column", padding: "2rem 1rem", zIndex: 50, background: "rgba(10,14,20,0.75)", backdropFilter: "blur(20px)", borderRight: "1px solid rgba(255,255,255,0.06)", boxShadow: `4px 0 24px ${color}0a` }}>
        <div style={{ marginBottom: "2.5rem", padding: "0 0.75rem" }}>
          <div style={{ fontSize: "0.625rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.2em", color, marginBottom: "0.25rem" }}>Lecsum</div>
          <p style={{ fontSize: "0.5625rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.2)" }}>Study Materials</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => !t.disabled && setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.75rem",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              border: "none",
              transition: "all .2s",
              textAlign: "left",
              background: tab === t.id ? `${color}15` : "transparent",
              color: tab === t.id ? color : "rgba(255,255,255,0.4)",
              borderRight: tab === t.id ? `2px solid ${color}` : "2px solid transparent",
              opacity: t.disabled ? 0.3 : 1,
              cursor: t.disabled ? "not-allowed" : "pointer",
              pointerEvents: t.disabled ? "none" : "all",
            }}
          >
            <span style={{ color: tab === t.id ? color : "rgba(255,255,255,0.25)" }}>{t.icon}</span>
              {t.label}
              {t.disabled && (
                <span style={{ fontSize: "0.5rem", fontFamily: "monospace", marginLeft: "auto", color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>N/A</span>
              )}
          </button>
        ))}
      </div>

        <button onClick={() => router.push("/dashboard")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0.625rem 1rem", borderRadius: "0.75rem", fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", transition: "color .2s" }}>
          <BackIcon />
          Dashboard
        </button>
      </nav>

      {/* Topbar */}
      <header style={{ position: "fixed", top: 0, left: 240, right: 0, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2rem", zIndex: 40, background: "rgba(10,14,20,0.5)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "rgba(255,255,255,0.9)", fontFamily: "'DM Serif Display',serif", textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lectureTitle || "Study Materials"}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <svg style={{ position: "absolute", left: 10, width: 13, height: 13, color: "rgba(255,255,255,0.25)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input placeholder="Search insights…"
              style={{ paddingLeft: 32, paddingRight: 16, paddingTop: 6, paddingBottom: 6, fontSize: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", outline: "none", width: 200 }} />
          </div>
          <button style={{ padding: "0.375rem", borderRadius: "0.5rem", border: "none", background: "transparent", color: "rgba(255,255,255,0.35)", cursor: "pointer" }}>
            <BookmarkIcon />
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ position: "relative", zIndex: 10, marginLeft: 240, paddingTop: 80, paddingBottom: 100, paddingLeft: 48, paddingRight: 48 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {tab === "summary" && <SummaryTab transcriptKey={transcriptKey} color={color} />}
          {tab === "quiz" && <QuizTab transcriptKey={transcriptKey} color={color} />}
          {tab === "flashcards" && <FlashcardsTab transcriptKey={transcriptKey} color={color} />}
          {tab === "transcript" && <TranscriptTab transcriptKey={transcriptKey} color={color} />}
        </div>
      </main>

      {/* FABs */}
      <div style={{ position: "fixed", bottom: 32, right: 32, display: "flex", flexDirection: "column", gap: "0.75rem", zIndex: 50 }}>
        <button style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.75rem 1.25rem", borderRadius: "99px", fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer", background: "rgba(20,28,24,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", transition: "transform .15s" }}>
          <BookmarkIcon />
          Bookmark
        </button>
        <button onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.75rem 1.25rem", borderRadius: "99px", fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer", background: color, border: "none", color: "#000", boxShadow: `0 8px 32px ${color}50`, transition: "transform .15s" }}>
          <ExportIcon />
          Export PDF
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        button:hover { filter: brightness(1.1); }
      `}</style>
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0e14" }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(74,222,128,0.3)", borderTopColor: "#4ade80", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <StudyContent />
    </Suspense>
  );
}