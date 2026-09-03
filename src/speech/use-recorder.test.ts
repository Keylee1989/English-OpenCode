import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { pickAudioMime } from "@/speech/audio-mime";
import { useRecorder, type RecorderDeps } from "@/speech/use-recorder";

describe("pickAudioMime", () => {
  it("returns the first supported candidate in preference order", () => {
    const isTypeSupported = (m: string) =>
      m === "audio/webm" || m === "audio/mp4;codecs=mp4a.40.2";
    expect(pickAudioMime(isTypeSupported)).toBe("audio/webm");
  });

  it("prefers webm(opus) when the browser supports it (desktop default)", () => {
    expect(pickAudioMime(() => true)).toBe("audio/webm;codecs=opus");
  });

  it("falls back to mp4 when the browser only supports mp4 (typical iOS Safari)", () => {
    const isTypeSupported = (m: string) => m.startsWith("audio/mp4");
    expect(pickAudioMime(isTypeSupported)).toBe("audio/mp4");
  });

  it("returns a deterministic safe default when nothing is supported (no-browser tests)", () => {
    expect(pickAudioMime()).toBe("audio/webm");
  });
});

// ---- Fake MediaRecorder that behaves like the real thing ----------------
class FakeMediaRecorder {
  static lastInstance: FakeMediaRecorder | null = null;
  static isTypeSupported = (_mime?: string): boolean => true;

  state: RecordingState = "inactive";
  mimeType = "";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_stream: MediaStream, opts?: { mimeType?: string }) {
    this.mimeType = opts?.mimeType ?? "";
    FakeMediaRecorder.lastInstance = this;
  }
  start(): void {
    this.state = "recording";
  }
  stop(): void {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["engine-360"]) });
    this.onstop?.();
  }
}

interface SeededDeps extends RecorderDeps {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream> & { mockRejectedValue: (v: unknown) => void; mockResolvedValue: (v: MediaStream) => void };
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

function makeDeps(): SeededDeps {
  const getUserMediaMock = vi.fn(
    () => Promise.resolve({ getTracks: () => [] } as unknown as MediaStream),
  );
  return {
    getUserMedia: getUserMediaMock as unknown as SeededDeps["getUserMedia"],
    MediaRecorderCtor: FakeMediaRecorder as unknown as typeof MediaRecorder,
    isTypeSupported: (m: string) => FakeMediaRecorder.isTypeSupported(m),
    createObjectURL: (b: Blob) => `blob:mock-${b.size}`,
    revokeObjectURL: vi.fn(),
  };
}

function setup(deps: SeededDeps = makeDeps()) {
  FakeMediaRecorder.lastInstance = null;
  return {
    deps,
    hook: renderHook(() => useRecorder(deps)),
  };
}

describe("useRecorder", () => {
  it("builds a working state machine: idle -> recording -> recorded", async () => {
    const { hook } = setup();

    expect(hook.result.current.status).toBe("idle");

    await act(async () => {
      await hook.result.current.start();
    });
    expect(hook.result.current.status).toBe("recording");

    act(() => {
      hook.result.current.stop();
    });
    expect(hook.result.current.status).toBe("recorded");
    expect(hook.result.current.recordedBlob).toBeInstanceOf(Blob);
    expect(hook.result.current.audioUrl).toMatch(/^blob:mock-/);
    expect(hook.result.current.error).toBeNull();
  });

  it("selects the probed MIME type for the recorder", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.start();
    });
    expect(FakeMediaRecorder.lastInstance?.mimeType).toBe("audio/webm;codecs=opus");
  });

  it("tracks a live elapsedMs while recording (timer for 录音中 · N 秒)", async () => {
    const { hook } = setup();
    expect(hook.result.current.status).toBe("idle");
    expect(hook.result.current.elapsedMs).toBe(0);
    await act(async () => {
      await hook.result.current.start();
    });
    expect(hook.result.current.status).toBe("recording");
    expect(typeof hook.result.current.elapsedMs).toBe("number");
    // durationMs is only finalized after stop; elapsedMs is the live ticker.
    expect(hook.result.current.durationMs).toBe(0);
    act(() => hook.result.current.stop());
    expect(hook.result.current.status).toBe("recorded");
    act(() => hook.result.current.reset());
    expect(hook.result.current.elapsedMs).toBe(0);
  });

  it("guards against a second start while already recording (no duplicate recorder)", async () => {
    const { hook } = setup();
    await act(async () => {
      await hook.result.current.start();
    });
    const first = FakeMediaRecorder.lastInstance;
    await act(async () => {
      await hook.result.current.start();
    });
    expect(FakeMediaRecorder.lastInstance).toBe(first);
  });

  it("surfaces a permission denial honestly and never fabricates a recording", async () => {
    const deps = makeDeps();
    (deps.getUserMedia as unknown as { mockRejectedValue: (v: unknown) => void }).mockRejectedValue({
      name: "NotAllowedError",
    });
    const { hook } = setup(deps);

    await act(async () => {
      await hook.result.current.start();
    });

    expect(hook.result.current.status).toBe("error");
    expect(hook.result.current.recordedBlob).toBeNull();
    expect(hook.result.current.audioUrl).toBeNull();
    expect(hook.result.current.error ?? "").toContain("权限被拒绝");
  });

  it("reports unsupported when no recorder / mic API exists (no fake success)", () => {
    const { result } = renderHook(() =>
      useRecorder({ MediaRecorderCtor: undefined, getUserMedia: undefined }),
    );
    expect(result.current.supported).toBe(false);
  });

  it("releases the blob URL on reset (re-record) to avoid leaks", async () => {
    const { deps, hook } = setup();
    await act(async () => {
      await hook.result.current.start();
    });
    act(() => hook.result.current.stop());
    const firstUrl = hook.result.current.audioUrl;
    act(() => hook.result.current.reset());
    expect(hook.result.current.audioUrl).toBeNull();
    expect(deps.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
  });

  it("stops mic tracks and releases the URL on unmount", async () => {
    const stopTrack = vi.fn();
    const deps = makeDeps();
    (deps.getUserMedia as unknown as { mockResolvedValue: (v: MediaStream) => void }).mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }],
    } as unknown as MediaStream);
    const { hook } = setup(deps);
    await act(async () => {
      await hook.result.current.start();
    });
    act(() => hook.result.current.stop());
    const url = hook.result.current.audioUrl;
    hook.unmount();
    expect(stopTrack).toHaveBeenCalled();
    expect(deps.revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it("never invents a pronunciation score (no auto-scoring field/fabrication)", async () => {
    const { hook } = setup();
    expect("score" in hook.result.current).toBe(false);
    await act(async () => {
      await hook.result.current.start();
    });
    act(() => hook.result.current.stop());
    expect(hook.result.current.recordedBlob).toBeInstanceOf(Blob);
    expect("score" in hook.result.current).toBe(false);
  });
});