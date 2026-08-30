/**
 * Text-to-speech wrapper - REAL browser speech synthesis (no fake audio).
 *
 * iOS Safari ships en-US voices for speechSynthesis; playback must be
 * triggered from a user gesture (our speaker buttons are). If the browser
 * has no TTS at all, callers MUST degrade honestly: skip listening tasks
 * and say why - never simulate audio or pretend it played.
 */

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let cachedVoice: SpeechSynthesisVoice | null = null;
let voiceLookupDone = false;

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  if (voiceLookupDone) return cachedVoice;
  voiceLookupDone = true;
  const voices = window.speechSynthesis.getVoices();
  // Prefer an explicit en-US voice (American English is the course target).
  cachedVoice =
    voices.find((v) => /en[-_]US/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null;
  // Voice list may load asynchronously on some browsers.
  if (!cachedVoice) {
    window.speechSynthesis.onvoiceschanged = () => {
      const refreshed = window.speechSynthesis.getVoices();
      cachedVoice =
        refreshed.find((v) => /en[-_]US/i.test(v.lang)) ??
        refreshed.find((v) => /^en/i.test(v.lang)) ??
        null;
    };
  }
  return cachedVoice;
}

/** Speak English text. Resolves when playback ends; rejects if unsupported. */
export function speakEn(text: string, rate = 0.92): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isSpeechSupported()) {
      reject(new Error("当前浏览器不支持语音合成"));
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = rate;
      const voice = pickEnglishVoice();
      if (voice) utterance.voice = voice;
      utterance.onend = () => resolve();
      utterance.onerror = (event) =>
        reject(event.error === "canceled" ? new Error("已取消") : new Error("语音播放失败"));
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("语音播放失败"));
    }
  });
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
