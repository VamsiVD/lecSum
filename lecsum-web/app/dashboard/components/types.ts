export interface Job {
  uploadKey: string;
  jobName?: string;
  transcriptKey?: string;
  fileName?: string;
  displayName?: string;
  status: string;
  createdAt?: string;
  course?: string;
}

export interface Course {
  id: string;
  name: string;
  color: string;
  lectureCount: number;
}

export interface BubblePos {
  top: number;
  left: number;
  arrowSide: "left" | "right";
  transformOrigin: string;
}

export const COURSE_COLORS = [
  "#4ade80", "#60a5fa", "#fbbf24", "#f87171",
  "#a78bfa", "#34d399", "#fb923c", "#e879f9",
];

export function courseGradient(hex: string): string {
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

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function cleanName(raw: string) {
  return raw.replace(/^[a-z0-9]+-\d+-/, "").replace(/\.[^.]+$/, "");
}