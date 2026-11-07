"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

function pickMime() {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return options.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) ?? "";
}

function extensionFor(mime: string) {
  if (mime.includes("mp4")) {
    return "m4a";
  }
  if (mime.includes("ogg")) {
    return "ogg";
  }
  return "webm";
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export type AudioRecorderHandle = {
  start: () => Promise<void>;
  stop: () => void;
};

export const AudioRecorder = forwardRef<
  AudioRecorderHandle,
  {
    disabled?: boolean;
    onRecorded: (file: File) => void;
    onError: (message: string) => void;
    onRecordingChange?: (recording: boolean) => void;
  }
>(function AudioRecorder({ disabled, onRecorded, onError, onRecordingChange }, ref) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!recording) {
      return;
    }
    const tick = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);
    return () => window.clearInterval(tick);
  }, [recording]);

  useEffect(() => {
    return () => stopTracks();
  }, []);

  function setIsRecording(value: boolean) {
    setRecording(value);
    onRecordingChange?.(value);
  }

  function stopTracks() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  async function start() {
    if (recording || disabled) {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("Bu tarayıcı mikrofon kaydını desteklemiyor.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);
        if (blob.size < 1024) {
          onError("Kayıt çok kısa veya alınamadı.");
          return;
        }
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const file = new File([blob], `kayit-${stamp}.${extensionFor(type)}`, { type });
        onRecorded(file);
      };
      recorder.start(250);
      recorderRef.current = recorder;
      startedAt.current = Date.now();
      setElapsed(0);
      setIsRecording(true);
      onError("");
    } catch {
      onError("Mikrofona erişilemedi. İzin verip tekrar dene.");
    }
  }

  function stop() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  useImperativeHandle(ref, () => ({ start, stop }));

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (recording) {
          stop();
          return;
        }
        void start();
      }}
      className={`flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 text-center sm:min-h-64 ${
        recording
          ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/30"
          : "border-violet-200 bg-violet-50/70 hover:border-violet-400 dark:border-slate-700 dark:bg-slate-800/60"
      }`}
    >
      {recording ? (
        <>
          <span className="h-16 w-16 animate-pulse rounded-full bg-red-500" />
          <p className="mt-4 text-lg font-semibold text-red-600">Kayıt alınıyor</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-red-600">{formatElapsed(elapsed)}</p>
          <p className="mt-2 text-sm text-slate-500">Durdurmak için tekrar bas</p>
        </>
      ) : (
        <>
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-2xl text-white">
            ●
          </span>
          <p className="mt-4 text-lg font-semibold text-slate-800 dark:text-white">Ses kaydet</p>
          <p className="mt-1 text-sm text-slate-500">Mikrofona bas, konuş, bitince durdur</p>
        </>
      )}
    </button>
  );
});
