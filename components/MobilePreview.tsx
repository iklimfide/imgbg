"use client";

import { useEffect, useState } from "react";

export function MobilePreview() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("mobile-preview", on);
    return () => document.documentElement.classList.remove("mobile-preview");
  }, [on]);

  return (
    <button
      type="button"
      className="fixed bottom-16 left-4 z-50 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-4 text-sm font-medium text-white shadow-lg hover:bg-violet-500"
      onClick={() => setOn((value) => !value)}
    >
      {on ? "Masaüstüne dön" : "Mobil tasarımı göster"}
    </button>
  );
}
