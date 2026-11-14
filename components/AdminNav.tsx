import Link from "next/link";

const LINKS = [
  { href: "/admin", key: "uploads", label: "Yüklemeler" },
  { href: "/admin/kullanicilar", key: "users", label: "Kullanıcılar" },
] as const;

export function AdminNav({ current }: { current: "uploads" | "users" }) {
  return (
    <nav className="mb-3 flex gap-1">
      {LINKS.map((item) => {
        const on = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-medium ${
              on
                ? "bg-violet-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
