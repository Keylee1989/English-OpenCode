import { useEffect, useRef, useState } from "react";
import { saveAttempt, setSelfReview } from "@/speech/speaking-attempts";
import { track } from "@/data/recorder";

/**
 * Phase 6 voice basics for role play: play the AI line (TTS), record the
 * learner's attempt, persist the blob, then collect a SELF-score.
 * The system never auto-grades pronunciation.
 *
 * Phase 11-A Task 2: instant playback of the just-recorded attempt
 * (play / pause / replay). Still zero auto-scoring - the blob is only
 * played back locally; grading remains the learner's own star rating.
 */
export function RoleplayRecorder({
  sessionId,
  lastAiEn,
}: {
  sessionId: string | null;
  lastAiEn: string;
}) {
  const [recording, setRecording] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [failZh, setFailZh] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Phase 11-A Task 2: local audio element for immediate playback.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playState, setPlayState] = useState<"idle" | "playing" | "paused">("idle");
  const canRecord =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  // Stop any local playback when the recorder unmounts or session changes.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayState("idle");
    };
  }, [sessionId]);

  const ensureAudio = (): HTMLAudioElement | null => {
    if (!audioRef.current) return null;
    return audioRef.current;
  };

  const playAttempt = (): void => {
    const audio = ensureAudio();
    if (!audio) return;
    void audio.play().then(
      () => setPlayState("playing"),
      () => setFailZh("播放失败：录音文件不可用。"),
    );
  };

  const toggle = async (): Promise<void> => {
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        chunksRef.current = [];
        rec.ondataavailable = (e) => chunksRef.current.push(e.data);
        rec.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          if (!sessionId) return;
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
          const row = await saveAttempt({
            conversationId: sessionId,
            promptEn: lastAiEn,
            audio: blob,
          });
          setAttemptId(row.id);
          // Phase 11-A Task 2: prepare the saved blob for instant replay.
          audioRef.current?.pause();
          audioRef.current = new Audio(URL.createObjectURL(blob));
          audioRef.current.onended = () => setPlayState("idle");
          setPlayState("idle");
          await track({
            skill: "speaking",
            interaction: "self-assess",
            correct: null,
            selfReported: true,
            meta: { attemptId: row.id },
          });
        };
        rec.start();
        recRef.current = rec;
        setRecording(true);
      } catch {
        setFailZh("无法启动录音（权限或设备不支持）。文字输入不受影响。");
      }
    } else {
      recRef.current?.stop();
      setRecording(false);
    }
  };

  return (
    <div>
      {!canRecord && (
        <p className="fineprint">当前浏览器不支持录音；可使用文字输入继续对话。</p>
      )}
      <button
        type="button"
        className="btn option-btn btn-block"
        disabled={!sessionId}
        onClick={() => void toggle()}
      >
        {recording ? "⏹ 停止录音" : "🎙 录音跟读上一句"}
      </button>
      {attemptId && (
        <div className="example-box">
          <p className="fineprint">
            录音已保存。回放后给自己打分（1-5，系统不自动评分）：
          </p>
          {/* Phase 11-A Task 2: playback controls for the fresh recording. */}
          <div className="row-2" style={{ marginBottom: 6 }}>
            <button
              type="button"
              className="btn option-btn"
              disabled={playState === "playing"}
              onClick={playAttempt}
            >
              ▶ 播放录音
            </button>
            <button
              type="button"
              className="btn option-btn"
              disabled={playState !== "playing"}
              onClick={() => {
                audioRef.current?.pause();
                setPlayState("paused");
              }}
            >
              ⏸ 暂停
            </button>
            <button
              type="button"
              className="btn option-btn"
              onClick={() => {
                const audio = ensureAudio();
                if (!audio) return;
                audio.currentTime = 0;
                playAttempt();
              }}
            >
              ↻ 重新播放
            </button>
          </div>
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              className="linklike"
              onClick={() => void setSelfReview(attemptId, score)}
            >
              {score}★
            </button>
          ))}
        </div>
      )}
      {failZh && <p className="notice">{failZh}</p>}
    </div>
  );
}
