"use client";

import { useEffect } from "react";

export function MediaCacheWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    void navigator.serviceWorker.register("/imgbg-sw.js").catch(() => undefined);
  }, []);
  return null;
}
