/**
 * Audio recording MIME-type selection for the microphone recorder.
 *
 * iOS Safari restricts MediaRecorder to a small set (often only audio/mp4);
 * never hard-code a single format. We probe the browser with
 * `MediaRecorder.isTypeSupported` and fall back to a well-known type.
 *
 * Pure and IO-free so it is unit-testable without a browser (default
 * `isTypeSupported` returns false -> safe webm fallback).
 */

export const RECORDING_MIME_CANDIDATES: readonly string[] = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/ogg;codecs=opus",
  "audio/wav",
  "audio/aac",
];

export function pickAudioMime(
  isTypeSupported: (mime: string) => boolean = () => false,
): string {
  return (
    RECORDING_MIME_CANDIDATES.find((mime) => isTypeSupported(mime)) ??
    // Deterministic fallback that no-browser tests can rely on.
    "audio/webm"
  );
}