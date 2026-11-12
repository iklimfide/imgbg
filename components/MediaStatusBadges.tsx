export function remainingLabel(expiresAt: string | null | undefined) {
  if (!expiresAt) {
    return null;
  }
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) {
    return "Süresi doldu";
  }
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) {
    return `${Math.max(1, minutes)} dk`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${hours} sa`;
  }
  const days = Math.round(hours / 24);
  if (days < 60) {
    return `${days} gün`;
  }
  const months = Math.round(days / 30);
  if (months < 24) {
    return `${months} ay`;
  }
  return `${Math.round(days / 365)} y`;
}

export type MediaStatusInfo = {
  hidden?: boolean;
  password?: boolean;
  deleted?: boolean;
  expiresAt?: string | null;
};

export function MediaStatusBadges({
  hidden,
  password,
  deleted,
  expiresAt,
  compact,
  showForever,
}: MediaStatusInfo & { compact?: boolean; showForever?: boolean }) {
  const ttl = remainingLabel(expiresAt);
  const items: { key: string; label: string; className: string }[] = [];
  if (deleted) {
    items.push({ key: "d", label: "Silindi", className: "bg-red-600/90" });
  } else if (hidden) {
    items.push({ key: "h", label: "Gizli", className: "bg-amber-500/90" });
  }
  if (password) {
    items.push({ key: "p", label: compact ? "Şifre" : "Şifreli", className: "bg-violet-600/90" });
  }
  if (ttl) {
    items.push({
      key: "t",
      label: ttl,
      className: ttl === "Süresi doldu" ? "bg-red-700/90" : "bg-sky-700/90",
    });
  } else if (showForever && !deleted) {
    items.push({ key: "f", label: "Kalıcı", className: "bg-emerald-700/90" });
  }
  if (items.length === 0) {
    return null;
  }
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 flex flex-wrap gap-1 p-1.5 ${
        compact ? "top-0 justify-start" : "bottom-0 justify-start sm:p-2"
      }`}
    >
      {items.map((item) => (
        <span
          key={item.key}
          className={`rounded-full px-1.5 py-0.5 font-medium text-white shadow-sm ${item.className} ${
            compact ? "text-[10px] leading-4" : "text-xs leading-5 sm:px-2"
          }`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
