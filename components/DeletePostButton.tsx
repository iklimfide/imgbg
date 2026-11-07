"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeletePostButton({ kod }: { kod: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex min-h-11 items-center text-sm text-red-600 hover:text-red-500 disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
      onClick={async () => {
        if (!confirm("Bu paylaşımı silmek istiyor musun?")) {
          return;
        }
        setPending(true);
        const response = await fetch(`/api/posts/${kod}`, { method: "DELETE" });
        setPending(false);
        if (response.ok) {
          router.refresh();
        }
      }}
    >
      {pending ? "Siliniyor..." : "Sil"}
    </button>
  );
}
