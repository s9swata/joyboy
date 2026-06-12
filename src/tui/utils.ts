export function getPageSlice<T>(items: T[], selectedIndex: number, pageSize: number): { start: number; items: T[] } {
  if (items.length === 0) {
    return { start: 0, items: [] };
  }

  const safeIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));
  const page = Math.floor(safeIndex / pageSize);
  const start = page * pageSize;
  const end = Math.min(start + pageSize, items.length);
  return { start, items: items.slice(start, end) };
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
