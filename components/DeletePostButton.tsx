"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";

export function DeletePostButton({ kod }: { kod: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [ask, setAsk] = useState(false);

  async function remove() {
    setPending(true);
    const response = await fetch(`/api/posts/${kod}`, { method: "DELETE" });
    setPending(false);
    setAsk(false);
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        className="inline-flex min-h-9 items-center rounded-lg bg-red-600 px-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60"
        onClick={() => setAsk(true)}
      >
        {pending ? "Siliniyor..." : "Sil"}
      </button>
      <ConfirmModal
        open={ask}
        message="Bu paylaşımı silmek istiyor musun?"
        pending={pending}
        onCancel={() => setAsk(false)}
        onConfirm={() => void remove()}
      />
    </>
  );
}
