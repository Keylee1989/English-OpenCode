/**
 * Microphone recorder hook for real "record & listen back" in Speaking /
 * shadowing exercises.
 *
 * Honesty contract:
 *  - Recording requires a real getUserMedia grant; denial is surfaced, never
 *    faked as a successful recording.
 *  - We only capture and play back the learner's own audio. We NEVER auto-score
 *    pronunciation. Learning evidence stays low-weight self-assessment.
 *  - Works on iOS Safari: MediaRecorder MIME type is probed via
 *    `pickAudioMime`, Blob URLs are released on stop/unmount, active
 *    MediaRecorder and tracks are stopped on unmount to prevent leaks.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { pickAudioMime } from "@/speech/audio-mime";

export type RecorderStatus =
  | "idle"
  | "recording"
  | "recorded"
  | "unsupported"
  | "error";

export interface RecorderDeps {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  MediaRecorderCtor?: typeof MediaRecorder;
  isTypeSupported?: (mime: string) => boolean;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
}

export interface UseRecorderResult {
  status: RecorderStatus;
  /** Local blob URL of the finished recording; released on re-record/unmount. */
  audioUrl: string | null;
  recordedBlob: Blob | null;
  durationMs: number;
  error: string | null;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

function defaultDeps(): Required<RecorderDeps> {
  return {
    getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
    MediaRecorderCtor: window.MediaRecorder,
    isTypeSupported: (m) =>
      typeof window.MediaRecorder !== "undefined" &&
      typeof window.MediaRecorder.isTypeSupported === "function" &&
      window.MediaRecorder.isTypeSupported(m),
    createObjectURL: (b) =>
      typeof URL.createObjectURL === "function" ? URL.createObjectURL(b) : "",
    revokeObjectURL: (u) => {
      if (u && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(u);
    },
  };
}

export function useRecorder(
  deps: RecorderDeps = {},
  onSubmit?: (blob: Blob) => void,
): UseRecorderResult {
  // Resolve DI vs browser defaults. A key explicitly supplied (even as
  // `undefined`) forces that capability; omitted keys fall back to the real
  // browser API. This keeps the hook unit-testable without a MediaRecorder.
  const d = useMemo<Required<RecorderDeps>>(() => {
    const base = defaultDeps();
    const out = { ...base } as Required<RecorderDeps>;
    (Object.keys(base) as (keyof RecorderDeps)[]).forEach((key) => {
      if (key in deps) out[key] = deps[key] as never;
    });
    return out;
  }, [deps]);

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const objectUrlRef = useRef<string | null>(null);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  });

  const supported = Boolean(d.MediaRecorderCtor && d.getUserMedia);

  const releaseUrl = useCallback(() => {
    if (objectUrlRef.current) {
      d.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, [d]);

  useEffect(() => {
    return () => {
      // Stop recorder + mic + release blob URL on unmount (prevents leaks).
      const rec = recRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.onstop = null;
          rec.stop();
        } catch {
          /* already stopped */
        }
      }
      recRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      releaseUrl();
    };
  }, [releaseUrl]);

  const start = useCallback(async () => {
    if (!supported) {
      setStatus("unsupported");
      return;
    }
    if (recRef.current) return; // prevent duplicate MediaRecorder
    setError(null);
    setDurationMs(0);
    try {
      const stream = await d.getUserMedia({ audio: true });
      streamRef.current = stream;
      const Ctor = d.MediaRecorderCtor;
      const mime = pickAudioMime(d.isTypeSupported);
      const rec = (mime ? new Ctor(stream, { mimeType: mime }) : new Ctor(stream)) as MediaRecorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mime || "audio/webm",
        });
        const url = d.createObjectURL(blob);
        releaseUrl();
        objectUrlRef.current = url;
        setRecordedBlob(blob);
        setAudioUrl(url);
        setDurationMs(Date.now() - startedAtRef.current);
        setStatus("recorded");
        recRef.current = null;
        onSubmitRef.current?.(blob);
      };
      rec.onerror = () => {
        stream.getTracks().forEach((t) => t.stop());
        recRef.current = null;
        setStatus("error");
        setError("录音出错，请重试。");
      };
      recRef.current = rec;
      rec.start();
      setStatus("recording");
    } catch (err) {
      recRef.current = null;
      setStatus("error");
      setError(
        typeof err === "object" && err && "name" in err && (err as { name?: string }).name === "NotAllowedError"
          ? "麦克风权限被拒绝。请在浏览器设置中允许麦克风后重试；否则只能自评，无法录下你的声音。"
          : "无法启动录音（权限或设备不支持）。你仍可直接跟读并自评。",
      );
    }
  }, [supported, d, releaseUrl]);

  const stop = useCallback(() => {
    if (recRef.current && recRef.current.state !== "inactive") {
      recRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    releaseUrl();
    setAudioUrl(null);
    setRecordedBlob(null);
    setStatus("idle");
    setError(null);
    setDurationMs(0);
    recRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, [releaseUrl]);

  return { status, audioUrl, recordedBlob, durationMs, error, supported, start, stop, reset };
}