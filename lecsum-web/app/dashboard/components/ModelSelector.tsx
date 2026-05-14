"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ModelId =
  | "us.anthropic.claude-haiku-4-5-20251001-v1:0"
  | "us.anthropic.claude-sonnet-4-5-20250930-v1:0"
  | "us.anthropic.claude-opus-4-20250514-v1:0";

export const MODELS: { id: ModelId; label: string; tag: string; description: string }[] = [
  {
    id: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    label: "Haiku",
    tag: "Fast",
    description: "Quick responses, lower cost",
  },
  {
    id: "us.anthropic.claude-sonnet-4-5-20250930-v1:0",
    label: "Sonnet",
    tag: "Balanced",
    description: "Quality and speed",
  },
  {
    id: "us.anthropic.claude-opus-4-20250514-v1:0",
    label: "Opus",
    tag: "Powerful",
    description: "Best quality, slower",
  },
];

interface ModelSelectorProps {
  value: ModelId;
  onChange: (id: ModelId) => void;
  isDark: boolean;
}

export function ModelSelector({ value, onChange, isDark }: ModelSelectorProps) {
  const current = MODELS.find(m => m.id === value) ?? MODELS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`w-full justify-between text-xs h-8 px-2.5 flex items-center rounded-md border outline-none focus:ring-2 focus:ring-offset-2 ${
          isDark
            ? "bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08] focus:ring-white/20"
            : "bg-white/60 border-black/10 text-gray-800 hover:bg-white/80 focus:ring-black/20"
        }`}
      >
        <span className="flex items-center gap-2">
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
              isDark ? "bg-white/8 text-white/50" : "bg-black/6 text-gray-400"
            }`}
          >
            {current.tag}
          </span>
          {current.label}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="opacity-50"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={`w-52 ${
          isDark ? "bg-[#0d1512] border-white/10 text-white" : "bg-white border-black/10 text-gray-900"
        }`}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel
            className={`text-[9px] uppercase tracking-widest ${isDark ? "text-white/30" : "text-gray-400"}`}
          >
            AI Model
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup value={value} onValueChange={v => onChange(v as ModelId)}>
            {MODELS.map(m => (
              <DropdownMenuRadioItem
                key={m.id}
                value={m.id}
                className={`text-xs ${
                  isDark ? "text-white focus:bg-white/8" : "text-gray-900 focus:bg-black/5"
                }`}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-mono px-1 py-0.5 rounded ${
                        isDark ? "bg-white/8 text-white/40" : "bg-black/6 text-gray-400"
                      }`}
                    >
                      {m.tag}
                    </span>
                    {m.label}
                  </span>
                  <span className={`text-[10px] ${isDark ? "text-white/30" : "text-gray-400"}`}>
                    {m.description}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
