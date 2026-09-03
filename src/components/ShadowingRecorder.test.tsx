import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShadowingRecorder } from "@/components/ShadowingRecorder";
import type { RecorderDeps } from "@/speech/use-recorder";

const speakEnMock = vi.fn((_text: string) => Promise.resolve());
vi.mock("@/speech/tts", () => ({
  isSpeechSupported: () => true,
  speakEn: (text: string) => speakEnMock(text),
  stopSpeaking: vi.fn(),
}));

const EN = "Hello, how are you?";
const ZH = "你好，你好吗？";

class FakeRecorder {
  static lastInstance: FakeRecorder | null = null;
  static isTypeSupported = (_mime?: string): boolean => true;
  state: RecordingState = "inactive";
  mimeType = "";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(_stream: MediaStream, opts?: { mimeType?: string }) {
    this.mimeType = opts?.mimeType ?? "";
    FakeRecorder.lastInstance = this;
  }
  start(): void {
    this.state = "recording";
  }
  stop(): void {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["abc-mine"]) });
    this.onstop?.();
  }
}

function recorderDeps(): RecorderDeps {
  const getUserMedia = vi.fn(
    () => Promise.resolve({ getTracks: () => [] } as unknown as MediaStream),
  ) as unknown as (constraints: MediaStreamConstraints) => Promise<MediaStream> & {
    mockRejectedValue: (v: unknown) => void;
  };
  return {
    getUserMedia,
    MediaRecorderCtor: FakeRecorder as unknown as typeof MediaRecorder,
    isTypeSupported: (m: string) => FakeRecorder.isTypeSupported(m),
    createObjectURL: () => "blob:shadow",
    revokeObjectURL: vi.fn(),
  };
}

function renderRecorder(deps?: RecorderDeps, onSelfRated = vi.fn()) {
  return render(
    <ShadowingRecorder en={EN} zh={ZH} itemKey="d1-sh-0" onSelfRated={onSelfRated} recorderDeps={deps} />,
  );
}

describe("ShadowingRecorder", () => {
  beforeEach(() => {
    speakEnMock.mockClear();
  });

  it("auto-plays the English prompt on entry and shows the prompt line", () => {
    renderRecorder(recorderDeps());
    expect(speakEnMock).toHaveBeenCalledWith(EN);
    expect(screen.getByText(/请跟读/)).toBeTruthy();
    expect(screen.getByText(EN)).toBeTruthy();
  });

  it("shows 播放示范 and 开始录音, and is openly honest about no fake scoring", () => {
    renderRecorder(recorderDeps());
    expect(screen.getByRole("button", { name: /播放示范/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /开始录音/ })).toBeTruthy();
    expect(screen.getByText(/未启用自动发音评分/)).toBeTruthy();
    expect(screen.getByText(/自评仅作为低权重学习证据/)).toBeTruthy();
  });

  it("shows a live 录音中 · N 秒 timer while recording", async () => {
    renderRecorder(recorderDeps());
    fireEvent.click(screen.getByRole("button", { name: /开始录音/ }));
    await screen.findByRole("button", { name: /停止录音/ });
    // Sound button because the recorder reports an elapsed duration.
    screen.getByRole("button", { name: /停止录音/ });
    expect(screen.getByText(/录音中 · \d+ 秒/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /停止录音/ }));
  });

  it("records and then shows my-recording replay + re-record + duration", async () => {
    renderRecorder(recorderDeps());
    fireEvent.click(screen.getByRole("button", { name: /开始录音/ }));
    await screen.findByRole("button", { name: /停止录音/ });
    fireEvent.click(screen.getByRole("button", { name: /停止录音/ }));

    expect(screen.getByRole("button", { name: /播放我的录音/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /重新录音/ })).toBeTruthy();
    expect(screen.getByText(/已录音 .* 秒/)).toBeTruthy();
  });

  it("keeps self-assessment controls — recording never fabricates a pronunciation score", async () => {
    renderRecorder(recorderDeps());
    // Self-rating star buttons exist before any recording.
    for (const s of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole("button", { name: new RegExp(`${s}★`) })).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("button", { name: /开始录音/ }));
    await screen.findByRole("button", { name: /停止录音/ });
    fireEvent.click(screen.getByRole("button", { name: /停止录音/ }));
    // Honest note remains; there is no auto-scored pronunciation result element.
    expect(screen.getByText(/未启用自动发音评分/)).toBeTruthy();
    expect(screen.queryByText(/得分|pronunciation score|综合评分/)).toBeNull();
  });

  it("shows an explicit honest message when mic permission is denied", async () => {
    const deps = recorderDeps();
    (deps.getUserMedia as unknown as { mockRejectedValue: (v: unknown) => void }).mockRejectedValue({
      name: "NotAllowedError",
    });
    renderRecorder(deps);
    fireEvent.click(screen.getByRole("button", { name: /开始录音/ }));
    await screen.findByText(/麦克风权限被拒绝/);
  });

  it("forwards the self-rated decision to finish the exercise", () => {
    const onSelfRated = vi.fn();
    renderRecorder(recorderDeps(), onSelfRated);
    fireEvent.click(screen.getByRole("button", { name: /我读出来了/ }));
    expect(onSelfRated).toHaveBeenCalledWith({ kind: "self-rated-able" });
    fireEvent.click(screen.getByRole("button", { name: /还不太会/ }));
    expect(onSelfRated).toHaveBeenCalledWith({ kind: "self-rated-unable" });
  });
});