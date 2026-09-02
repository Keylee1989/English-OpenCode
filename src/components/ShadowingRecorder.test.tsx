import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShadowingRecorder } from "@/components/ShadowingRecorder";
import type { RecorderDeps } from "@/speech/use-recorder";

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
  it("shows 播放示范 and 开始录音, and is openly honest about no fake scoring", () => {
    renderRecorder(recorderDeps());
    expect(screen.getByRole("button", { name: /播放示范/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /开始录音/ })).toBeTruthy();
    expect(screen.getByText(/不自动打分/)).toBeTruthy();
    expect(screen.getByText(/自评只作低权重证据/)).toBeTruthy();
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
    expect(screen.getByText(/不自动打分/)).toBeTruthy();
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
  });
});