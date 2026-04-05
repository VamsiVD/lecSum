"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Tab = "summary" | "quiz" | "transcript";
type Status = "loading" | "done" | "error";

type Summary = {
  tldr: string;
  key_concepts: string[];
  summary: string;
  topics: string[];
};

type Question = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

function StudyContent() {
  const params = useSearchParams();
  const key = params.get("key") ?? "";

  const [tab, setTab] = useState<Tab>("summary");
  const [transcript, setTranscript] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [transcriptStatus, setTranscriptStatus] = useState<Status>("loading");
  const [summaryStatus, setSummaryStatus] = useState<Status>("loading");
  const [quizStatus, setQuizStatus] = useState<Status>("loading");

  // Quiz state
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState<boolean[]>([]);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!key) return;
    fetch(`/api/transcript?key=${encodeURIComponent(key)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.text(); })
      .then((t) => { setTranscript(t); setTranscriptStatus("done"); })
      .catch(() => setTranscriptStatus("error"));
  }, [key]);

  useEffect(() => {
    if (!key) return;
    fetch(`/api/summary?key=${encodeURIComponent(key)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setSummary(d); setSummaryStatus("done"); })
      .catch(() => setSummaryStatus("error"));
  }, [key]);

  useEffect(() => {
    if (!key) return;
    fetch(`/api/quiz?key=${encodeURIComponent(key)}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        setQuestions(d.questions);
        setAnswered(new Array(d.questions.length).fill(false));
        setQuizStatus("done");
      })
      .catch(() => setQuizStatus("error"));
  }, [key]);

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === questions[current].correct;
    if (correct) setScore((s) => s + 1);
    const next = [...answered];
    next[current] = true;
    setAnswered(next);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setSelected(null);
    setAnswered(new Array(questions.length).fill(false));
    setScore(0);
    setFinished(false);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "summary",    label: "Summary" },
    { id: "quiz",       label: "Quiz" },
    { id: "transcript", label: "Transcript" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-2xl mx-auto">

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Study materials</h1>
          <a href="/" className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">← Back</a>
        </div>

        <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-800 mb-6">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? "border-violet-500 text-violet-600 dark:text-violet-400"
                  : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Summary tab ── */}
        {tab === "summary" && (
          <>
            {summaryStatus === "loading" && <LoadingSkeleton />}
            {summaryStatus === "error" && <ErrorBox message="Could not generate summary." />}
            {summaryStatus === "done" && summary && (
              <div className="space-y-5">
                <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 px-4 py-3">
                  <p className="text-xs font-medium text-violet-500 uppercase tracking-wider mb-1">tldr</p>
                  <p className="text-sm text-violet-900 dark:text-violet-100 leading-relaxed">{summary.tldr}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.topics.map((t) => (
                    <span key={t} className="text-xs px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">{t}</span>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Key concepts</p>
                  <div className="space-y-2">
                    {summary.key_concepts.map((c) => (
                      <div key={c} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{c}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Summary</p>
                  <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{summary.summary}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Quiz tab ── */}
        {tab === "quiz" && (
          <>
            {quizStatus === "loading" && <LoadingSkeleton />}
            {quizStatus === "error" && <ErrorBox message="Could not generate quiz." />}
            {quizStatus === "done" && questions.length > 0 && (
              <>
                {finished ? (
                  <div className="text-center py-10">
                    <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                      {score}/{questions.length}
                    </p>
                    <p className="text-sm text-zinc-400 mb-6">
                      {score === questions.length ? "Perfect score!" :
                       score >= questions.length * 0.7 ? "Good work!" :
                       "Keep studying!"}
                    </p>
                    <button
                      onClick={handleRestart}
                      className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Progress */}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-zinc-400">Question {current + 1} of {questions.length}</p>
                      <p className="text-xs text-zinc-400">{score} correct</p>
                    </div>
                    <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-6">
                      <div className="h-full bg-violet-500 rounded-full transition-all duration-300"
                        style={{ width: `${((current) / questions.length) * 100}%` }} />
                    </div>

                    {/* Question */}
                    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-5 mb-4">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 leading-6 mb-5">
                        {questions[current].question}
                      </p>
                      <div className="space-y-2">
                        {questions[current].options.map((opt, idx) => {
                          const isSelected = selected === idx;
                          const isCorrect = idx === questions[current].correct;
                          const showResult = selected !== null;
                          return (
                            <button
                              key={idx}
                              onClick={() => handleAnswer(idx)}
                              disabled={selected !== null}
                              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                                !showResult
                                  ? "border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/20 text-zinc-700 dark:text-zinc-300"
                                  : isCorrect
                                  ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300"
                                  : isSelected
                                  ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                                  : "border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500"
                              }`}
                            >
                              <span className="font-medium mr-2">{["A","B","C","D"][idx]}.</span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation */}
                      {selected !== null && (
                        <div className="mt-4 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                          <p className="text-xs font-medium text-zinc-500 mb-1">Explanation</p>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300">{questions[current].explanation}</p>
                        </div>
                      )}
                    </div>

                    {selected !== null && (
                      <button
                        onClick={handleNext}
                        className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
                      >
                        {current + 1 >= questions.length ? "See results" : "Next question"}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Transcript tab ── */}
        {tab === "transcript" && (
          <>
            {transcriptStatus === "loading" && <LoadingSkeleton />}
            {transcriptStatus === "error" && <ErrorBox message="Could not load transcript." />}
            {transcriptStatus === "done" && (
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-5">
                <p className="text-sm text-zinc-400 mb-4">
                  {transcript.split(" ").filter(Boolean).length.toLocaleString()} words
                </p>
                <p className="text-sm leading-7 text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{transcript}</p>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-full" />
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-5/6" />
      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse w-2/3" />
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
      {message}
    </div>
  );
}

export default function StudyPage() {
  return (
    <Suspense>
      <StudyContent />
    </Suspense>
  );
}