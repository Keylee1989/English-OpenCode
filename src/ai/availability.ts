/**
 * AI availability state machine (spec §28, §30).
 *
 * The core learning system NEVER depends on AI. This module is the single
 * honest answer to "can I use AI features right now?" and why not.
 *
 * Phase 0 reality: no provider is configured anywhere in the app, so the
 * default state is always "unconfigured". Later phases add:
 * - "proxy": recommended for deployment; key lives server-side.
 * - "local-key": bring-your-own-key stored on the device, opt-in only.
 */
import type { IAiProvider } from "@/ai/provider";

export type AiAvailability =
  | { state: "unconfigured"; reasonZh: string }
  | { state: "proxy"; proxyUrl: string }
  | { state: "local-key"; warningZh: string }
  | { state: "ready"; providerId: string };

export interface AiEnvironmentInput {
  /** URL of a user-owned secure proxy endpoint (future). */
  proxyUrl?: string | null;
  /** Whether the user opted into storing a personal key on this device (future). */
  hasLocalKey?: boolean;
  /** A constructed provider, when one exists (future phases inject this). */
  provider?: IAiProvider | null;
}

export function getAiAvailability(env: AiEnvironmentInput = {}): AiAvailability {
  if (env.provider) {
    return { state: "ready", providerId: env.provider.providerId };
  }
  if (env.proxyUrl && env.proxyUrl.length > 0) {
    return { state: "proxy", proxyUrl: env.proxyUrl };
  }
  if (env.hasLocalKey) {
    return {
      state: "local-key",
      warningZh: "密钥保存在本设备，存在被浏览器内代码读取的风险；仅建议个人使用。",
    };
  }
  return {
    state: "unconfigured",
    reasonZh: "尚未配置 AI 服务。核心学习功能（课程/复习/测评）不依赖 AI，可正常使用。",
  };
}
