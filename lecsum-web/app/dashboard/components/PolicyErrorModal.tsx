"use client";

interface PolicyErrorModalProps {
  error: string;
  onDismiss: () => void;
  onRemove: () => void;
}

export function PolicyErrorModal({ error, onDismiss, onRemove }: PolicyErrorModalProps) {
  const message = error.length > 200 ? error.slice(0, 200) + "…" : error;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 100,
    }}>
      <div style={{
        background: "rgba(20,14,14,0.95)", border: "1px solid rgba(248,113,113,0.25)",
        borderRadius: "1rem", padding: "2rem", maxWidth: 420, width: "90%",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={2}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <p style={{ color: "#f87171", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.125rem" }}>File blocked by AWS policy</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>This file could not be extracted</p>
          </div>
        </div>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8125rem", lineHeight: 1.6, marginBottom: "1.5rem", padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "monospace", wordBreak: "break-all" }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onDismiss}
            style={{ flex: 1, padding: "0.625rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: "0.8125rem", cursor: "pointer" }}
          >
            Dismiss
          </button>
          <button
            onClick={onRemove}
            style={{ flex: 1, padding: "0.625rem", borderRadius: "0.75rem", border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.08)", color: "#f87171", fontSize: "0.8125rem", cursor: "pointer" }}
          >
            Remove file
          </button>
        </div>
      </div>
    </div>
  );
}