"use client";

interface DeleteModalProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteModal({ name, onConfirm, onCancel }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-card rounded-2xl p-6 max-w-sm w-full mx-4 border border-white/15">
        <div className="w-10 h-10 rounded-full bg-red-400/15 border border-red-400/25 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          </svg>
        </div>
        <h3 className="text-base font-semibold mb-1">Delete lecture?</h3>
        <p className="text-sm opacity-50 mb-5">
          <span className="opacity-80 font-medium">{name}</span> will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 text-sm border border-white/15 rounded-xl px-4 py-2 hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 text-sm bg-red-500/80 hover:bg-red-500 text-white rounded-xl px-4 py-2 transition-colors font-medium">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}