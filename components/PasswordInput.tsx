"use client";

import { useState } from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  visible?: boolean;
  onToggleVisible?: () => void;
};

export function PasswordInput({ className = "", visible, onToggleVisible, ...props }: Props) {
  const [localVisible, setLocalVisible] = useState(false);
  const shown = visible ?? localVisible;

  function toggle() {
    if (onToggleVisible) {
      onToggleVisible();
      return;
    }
    setLocalVisible((value) => !value);
  }

  return (
    <div className="relative">
      <input
        {...props}
        type={shown ? "text" : "password"}
        className={`${className} pr-11`.trim()}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={toggle}
        className="absolute right-1 top-1/2 inline-flex min-h-9 min-w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        aria-label={shown ? "Şifreyi gizle" : "Şifreyi göster"}
        title={shown ? "Şifreyi gizle" : "Şifreyi göster"}
      >
        {shown ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c5.5 0 9.5 4.5 10.5 7-.4.9-1.2 2.2-2.5 3.5M6.1 6.1C4 7.7 2.7 9.7 2 12c1 2.5 5 7 10 7 1.7 0 3.3-.4 4.7-1.1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
