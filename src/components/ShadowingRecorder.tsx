/**
 * ShadowingRecorder - the real "record & listen back" control for Speaking /
 * 跟读 exercises (StudyPage shadowing case).
 *
 * Honesty contract:
 *  - 播放示范 plays REAL TTS (auto-played once on entry; manual button stays).
 *  - 开始录音 requests the microphone and records the learner's own voice
 *    (no fake/no-op acknowledgement of permission); a live "录音中 · N 秒"
 *    timer is shown, then 停止录音 finalizes the clip.
 *  - We only capture + replay local audio. There is NO automatic pronunciation
 *    score - grading stays the learner's explicit SELF rating (low-weight
 *    evidence), saved through the existing `speakingAttempts` schema. The
 *    on-screen copy states this honestly when no AI scoring service is active.
 *  - iOS Safari: MIME type is probed (`pickAudioMime`), Blob URLs released on
 *    re-record/unmount, recorder/mic tracks stopped on unmount.
 *  - Permission denial is surfaced, never pretended to have recorded.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { speakEn } from "@/speech/tts";
import { useRecorder, type RecorderDeps } from "@/speech/use-recorder";
import { saveAttempt } from "@/speech/speaking-attempts";
import { track } from "@/data/recorder";
import type { ExerciseAnswer } from "@/study/exercise-types";

interface Props {
  en: string;
  zh: string;
  /** Stable pseudo-conversation key so recordings map into speakingAttempts. */
  itemKey: string;
  onSelfRated: (answer: ExerciseAnswer) => void;
  recorderDeps?: RecorderDeps;
}

export function ShadowingRecorder({ en, zh, itemKey, onSelfRated, recorderDeps }: Props) {
  const [selfScore, setSelfScore] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const recorder = useRecorder(recorderDeps, useCallback((blob: Blob) => {
    void saveAttempt({ conversationId: itemKey, promptEn: en, audio: blob }).then((row) => {
      void track({
        skill: "speaking",
        interaction: "shadowing",
        itemId: itemKey,
        correct: null,
        selfReported: true,
        meta: { attemptId: row.id, recorded: true },
      });
    });
  }, [itemKey, en]));

  const { status, audioUrl, durationMs, elapsedMs, error, supported, start, stop, reset } = recorder;

  // Clean up the local <audio> element + stop playback on unmount.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  // Auto-play the English prompt once on entering this question, so the user
  // immediately hears the sentence. A manual 播放示范 button stays available.
  const autoPlayedRef = useRef(false);
  useEffect(() => {
    if (autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    void speakEn(en).catch(() => undefined);
  }, [en]);

  // Keep <audio> in sync with a fresh recording.
  useEffect(() => {
    if (status === "recorded" && audioUrl) {
      audioRef.current?.pause();
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlaying(false);
      setPlaying(false);
    }
  }, [status, audioUrl]);

  const playMine = (): void => {
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().then(
      () => setPlaying(true),
      () => undefined,
    );
  };

  const seconds = Math.max(1, Math.round(durationMs / 1000));
  const recording = status === "recording";

  return (
    <div className="card">
      <p className="ex-kicker">跟读任务（听 → 跟读 → 录音 → 回放）</p>
      <h3>{en}</h3>
      <p className="dim">{zh}</p>

      <p className="fineprint" style={{ marginTop: 4 }}>
        请跟读：
        <strong> “{en}”</strong>
      </p>

      <div className="listen-play">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void speakEn(en).catch(() => undefined)}
        >
          🔊 播放示范
        </button>
        {!recording && status !== "recorded" && (
          <button type="button" className="btn btn-primary" onClick={() => void start()}>
            🎙 开始录音
          </button>
        )}
        {recording && (
          <button type="button" className="btn btn-primary" onClick={stop}>
            ⏹ 停止录音
          </button>
        )}
        {status === "recorded" && (
          <>
            <button
              type="button"
              className="btn option-btn"
              disabled={playing}
              onClick={playMine}
            >
              ▶ 播放我的录音
            </button>
            <button type="button" className="btn option-btn" onClick={reset}>
              🔄 重新录音
            </button>
          </>
        )}
      </div>

      {recording && (
        <p className="notice" style={{ marginTop: 8 }}>
          🎙 录音中 · {Math.max(1, Math.round(elapsedMs / 1000))} 秒 —— 请大声跟读。
        </p>
      )}
      {status === "recorded" && durationMs > 0 && (
        <p className="fineprint dim">已录音 {seconds} 秒（仅本机播放；可重新录音。）</p>
      )}
      {status === "unsupported" && (
        <p className="notice">当前浏览器不支持录音。你仍可跟读，并直接自评完成本练习。</p>
      )}
      {error && <p className="notice">{error}</p>}
      {!supported && status === "idle" && (
        <p className="fineprint">当前浏览器/设备不支持录音；仍可播放示范并跟读自评。</p>
      )}
      <p className="fineprint">
        当前未启用自动发音评分。你的录音会保存为学习记录，自评仅作为低权重学习证据。
      </p>

      <p className="fineprint">录音完成(或不录)后，请如实自评本次跟读：</p>
      <div className="row-2" style={{ marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            className="btn option-btn"
            style={selfScore === score ? { outline: "2px solid var(--accent)" } : undefined}
            onClick={() => {
              setSelfScore(score);
              if (recorder.recordedBlob) {
                void track({
                  skill: "speaking",
                  interaction: "self-assess",
                  itemId: itemKey,
                  correct: null,
                  selfReported: true,
                  meta: { selfScore: score, recorded: true },
                });
              }
            }}
          >
            {score}★
          </button>
        ))}
      </div>
      <div className="row-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onSelfRated({ kind: "self-rated-able" })}
        >
          我读出来了
        </button>
        <button
          type="button"
          className="btn option-btn"
          onClick={() => onSelfRated({ kind: "self-rated-unable" })}
        >
          还不太会
        </button>
      </div>
    </div>
  );
}