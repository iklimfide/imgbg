export function posterFromVideoFile(file: File) {
  return new Promise<Blob>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    const done = (blob: Blob | null) => {
      URL.revokeObjectURL(url);
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Video karesi alınamadı."));
    };
    video.onerror = () => done(null);
    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 1;
      video.currentTime = Math.min(0.4, Math.max(0.05, duration * 0.05));
    };
    video.onseeked = () => {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 360;
      const scale = Math.min(1, 384 / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        done(null);
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => done(blob), "image/webp", 0.72);
    };
  });
}

export function posterFromVideoElement(video: HTMLVideoElement) {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 360;
  if (!width || !height) {
    return Promise.resolve(null);
  }
  const scale = Math.min(1, 384 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.resolve(null);
  }
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  } catch {
    return Promise.resolve(null);
  }
  return new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/webp", 0.72);
    } catch {
      resolve(null);
    }
  });
}

export async function posterFromVideoUrl(url: string) {
  const response = await fetch(url, { credentials: "include", cache: "force-cache" });
  if (!response.ok) {
    return null;
  }
  const blob = await response.blob();
  if (!blob.size) {
    return null;
  }
  const file = new File([blob], "video", { type: blob.type || "video/mp4" });
  try {
    return await posterFromVideoFile(file);
  } catch {
    return null;
  }
}
