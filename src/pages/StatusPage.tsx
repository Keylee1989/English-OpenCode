import { useEffect, useState } from "react";
import { getAiAvailability, type AiAvailability } from "@/ai/availability";
import { AUTHORED_DAYS } from "@/content";
import { DATA_TABLE_NAMES, db, SCHEMA_VERSION } from "@/data/db";
import { ENGINE_REGISTRY, type EngineStatus } from "@/engines";
import { isSpeechSupported } from "@/speech/tts";
import {
  clearBetaLog,
  getBetaLog,
  getStudyMode,
  setStudyMode,
  type BetaEvent,
} from "@/study/beta-mode";
import {
  clearErrorLog,
  getRecentErrors,
  type ErrorLogEntry,
} from "@/core/error-log";
import { exportAllData, importFromFile } from "@/data/export-import";

const BETA_KIND_ZH: Record<string, string> = {
  "session-start": "开始学习会话",
  "session-end": "完成全部会话",
  "lesson-complete": "完成课程",
  "drop-off": "中途退出",
  "difficulty-feedback": "难度反馈",
};

type StorageStatus =
  | { state: "checking" }
  | { state: "ok"; counts: Record<string, number> }
  | { state: "error"; messageZh: string };

type SwState = "active" | "registered" | "unavailable";

const STATUS_LABEL_ZH: Record<EngineStatus, string> = {
  "not-implemented": "未实现",
  partial: "部分完成",
  ready: "已可用",
};

function badgeClass(status: EngineStatus): string {
  if (status === "ready") return "badge ok";
  if (status === "partial") return "badge warn";
  return "badge muted";
}

async function probeStorage(): Promise<StorageStatus> {
  try {
    await db.open();
    const counts: Record<string, number> = {};
    for (const name of DATA_TABLE_NAMES) {
      counts[name] = await db.table(name).count();
    }
    return { state: "ok", counts };
  } catch (error) {
    return {
      state: "error",
      messageZh: error instanceof Error ? error.message : String(error),
    };
  }
}

async function probeServiceWorker(): Promise<SwState> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return "unavailable";
  }
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return "unavailable";
  return registration.active ? "active" : "registered";
}

export default function StatusPage() {
  const [storage, setStorage] = useState<StorageStatus>({ state: "checking" });
  const [swState, setSwState] = useState<SwState>("unavailable");
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const aiAvailability: AiAvailability = getAiAvailability();

  useEffect(() => {
    void probeStorage().then(setStorage);
    void probeServiceWorker().then(setSwState);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const implementedCount = ENGINE_REGISTRY.filter(
    (engine) => engine.status !== "not-implemented",
  ).length;
  const learningAndAi = ENGINE_REGISTRY.filter((engine) => engine.category !== "infrastructure");
  const infrastructure = ENGINE_REGISTRY.filter((engine) => engine.category === "infrastructure");

  // Phase 11-C Task 6: Beta Test Mode toggle + recent telemetry log.
  const [studyMode, setStudyModeState] = useState<"normal" | "beta-test">("normal");
  const [betaLog, setBetaLog] = useState<BetaEvent[]>([]);
  // Phase 13 P0-3: recent crash/error entries.
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  // Phase 14 P1-2: export privacy controls (diagnostic logs OFF by default).
  const [exportOpts, setExportOpts] = useState({
    includeAiUsageLog: false,
    includeBetaLog: false,
    includeErrorLog: false,
  });
  const [exportDoneZh, setExportDoneZh] = useState<string | null>(null);
  const [importState, setImportState] = useState<{
    phase: "idle" | "picked" | "restoring" | "done" | "error";
    messageZh: string | null;
  }>({ phase: "idle", messageZh: null });

  useEffect(() => {
    void getStudyMode().then(setStudyModeState);
    void getBetaLog().then(setBetaLog);
    void getRecentErrors(20).then(setErrors);
  }, []);

  const runExport = async (): Promise<void> => {
    const envelope = await exportAllData(exportOpts);
    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `english360-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    const skipped = Object.entries(exportOpts)
      .filter(([, included]) => !included)
      .map(([key]) => key.replace("include", ""));
    setExportDoneZh(
      `已导出备份文件。${skipped.length > 0 ? `未包含：${skipped.join("、")}。` : ""}`,
    );
  };

  const handleImportFile = async (file: File): Promise<void> => {
    // Require an explicit confirm; the file is parsed only after approval.
    const fileText = file.name || "备份";
    const confirmed = window.confirm(
      `确认从「${fileText}」恢复？\n\n恢复会用备份内容覆盖当前的全部本地学习数据。\n\n恢复前会自动导出当前数据的备份文件。`,
    );
    if (!confirmed) {
      setImportState({ phase: "idle", messageZh: null });
      return;
    }

    setImportState({ phase: "restoring", messageZh: null });
    try {
      // Safety: back up current data before overwriting.
      const backup = await exportAllData(exportOpts);
      const backupUrl = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
      );
      const backupLink = document.createElement("a");
      backupLink.href = backupUrl;
      backupLink.download = `english360-before-import-${new Date().toISOString().slice(0, 10)}.json`;
      backupLink.click();
      URL.revokeObjectURL(backupUrl);

      const summary = await importFromFile(file);
      setImportState({
        phase: "done",
        messageZh: `导入成功：${Object.entries(summary.importedPerTable)
          .map(([table, count]) => `${table} ${count} 条`)
          .join("，")}。已自动导出恢复前的备份。`,
      });
      setStorage(await probeStorage());
    } catch (error) {
      setImportState({
        phase: "error",
        messageZh: `导入失败，当前数据未受影响：${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  };

  const pickImportFile = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) void handleImportFile(file);
    event.target.value = "";
  };

  const flipStudyMode = async (): Promise<void> => {
    const next = studyMode === "normal" ? "beta-test" : "normal";
    await setStudyMode(next);
    setStudyModeState(next);
    setBetaLog(await getBetaLog());
  };

  return (
    <div className="page">
      <header className="app-header">
        <h1>系统状态</h1>
        <span className="phase-tag">
          Phase 1 · 学习闭环已上线（Day 1-{AUTHORED_DAYS}）
        </span>
        <p className="lede">本页只展示真实实现状态，不包含占位式假功能。</p>
      </header>

      <section className="status-grid">
        <div className="status-card">
          <h2>本地存储</h2>
          {storage.state === "ok" && (
            <>
              <div className="status-line">
                <span className="label">IndexedDB</span>
                <span className="badge ok">正常</span>
              </div>
              <div className="status-line">
                <span className="label">Schema 版本</span>
                <span>v{SCHEMA_VERSION}</span>
              </div>
              {DATA_TABLE_NAMES.map((name) => (
                <div className="status-line" key={name}>
                  <span className="label">{name}</span>
                  <span>{storage.counts[name]} 条</span>
                </div>
              ))}
            </>
          )}
          {storage.state === "checking" && (
            <div className="status-line">
              <span className="label">检查中…</span>
            </div>
          )}
          {storage.state === "error" && (
            <div className="status-line">
              <span className="label">无法打开数据库</span>
              <span className="badge warn">{storage.messageZh}</span>
            </div>
          )}
        </div>

        <div className="status-card">
          <h2>PWA / 运行环境</h2>
          <div className="status-line">
            <span className="label">Service Worker</span>
            <span className={swState === "active" ? "badge ok" : "badge muted"}>
              {swState === "active" ? "已激活" : swState === "registered" ? "已注册" : "未激活"}
            </span>
          </div>
          <div className="status-line">
            <span className="label">语音合成（听力/口语）</span>
            <span className={isSpeechSupported() ? "badge ok" : "badge warn"}>
              {isSpeechSupported() ? "可用" : "不可用（听力题将跳过）"}
            </span>
          </div>
          <div className="status-line">
            <span className="label">网络</span>
            <span className={online ? "badge ok" : "badge muted"}>{online ? "在线" : "离线"}</span>
          </div>
        </div>

        <div className="status-card">
          <h2>Beta Test Mode（真实学习测试）</h2>
          <div className="status-line">
            <span className="label">当前模式</span>
            <span className={studyMode === "beta-test" ? "badge warn" : "badge ok"}>
              {studyMode === "beta-test" ? "Beta Test（记录额外数据）" : "Normal"}
            </span>
          </div>
          <p className="fineprint" style={{ margin: "4px 0 8px" }}>
            Beta 模式额外记录：会话开始/结束、课程完成、中途退出位置、难度反馈。
            不影响任何评分与学习逻辑。
          </p>
          <button type="button" className="btn btn-block" onClick={() => void flipStudyMode()}>
            {studyMode === "normal" ? "开启 Beta Test 模式" : "切回 Normal 模式"}
          </button>
          {betaLog.length > 0 && (
            <>
              <p className="fineprint" style={{ marginTop: 10 }}>
                最近 Beta 记录（{betaLog.length} 条，最新在前）：
              </p>
              <ul className="engine-list">
                {betaLog.slice(0, 12).map((event) => (
                  <li key={event.id}>
                    <span>
                      {BETA_KIND_ZH[event.kind] ?? event.kind}
                      {typeof event.payload.day === "number"
                        ? ` · Day ${event.payload.day}`
                        : ""}
                      {event.kind === "drop-off" &&
                      typeof event.payload.step === "number" &&
                      typeof event.payload.total === "number"
                        ? ` · 步骤 ${event.payload.step}/${event.payload.total}`
                        : ""}
                      {event.kind === "difficulty-feedback" &&
                      typeof event.payload.rating === "string"
                        ? ` · ${event.payload.rating}`
                        : ""}
                    </span>
                    <small>{new Date(event.ts).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="linklike"
                onClick={() => void clearBetaLog().then(() => setBetaLog([]))}
              >
                清空 Beta 记录
              </button>
            </>
          )}
        </div>

        <div className="status-card">
          <h2>数据导出（隐私控制）</h2>
          <p className="fineprint" style={{ margin: "4px 0 8px" }}>
            学习数据始终包含。诊断日志默认<strong>不导出</strong>，需要分享问题时再勾选。
          </p>
          <label style={{ display: "block", margin: "4px 0" }}>
            <input
              type="checkbox"
              checked={exportOpts.includeAiUsageLog}
              onChange={(event) =>
                setExportOpts((prev) => ({
                  ...prev,
                  includeAiUsageLog: event.target.checked,
                }))
              }
            />{" "}
            AI 使用统计（provider/model/feature 元数据）
          </label>
          <label style={{ display: "block", margin: "4px 0" }}>
            <input
              type="checkbox"
              checked={exportOpts.includeBetaLog}
              onChange={(event) =>
                setExportOpts((prev) => ({ ...prev, includeBetaLog: event.target.checked }))
              }
            />{" "}
            Beta 测试日志
          </label>
          <label style={{ display: "block", margin: "4px 0" }}>
            <input
              type="checkbox"
              checked={exportOpts.includeErrorLog}
              onChange={(event) =>
                setExportOpts((prev) => ({ ...prev, includeErrorLog: event.target.checked }))
              }
            />{" "}
            错误日志
          </label>
          <button type="button" className="btn option-btn btn-block" onClick={() => void runExport()}>
            导出备份（JSON）
          </button>
          {exportDoneZh && (
            <p className="fineprint" style={{ marginTop: 6 }}>
              {exportDoneZh}
            </p>
          )}
        </div>

        <div className="status-card">
          <h2>数据导入 / 恢复</h2>
          <p className="fineprint" style={{ margin: "4px 0 8px" }}>
            local-first 数据恢复能力：选择先前导出的 JSON 备份文件即可恢复。恢复会<strong>覆盖</strong>
            当前全部学习数据，因此导入前会自动导出当前数据的备份文件，并重建本地数据库。
          </p>
          <label className="btn option-btn btn-block" style={{ textAlign: "center" }}>
            选择备份文件（JSON）
            <input
              type="file"
              accept="application/json,.json"
              style={{ display: "none" }}
              onChange={pickImportFile}
            />
          </label>
          {importState.phase === "restoring" && (
            <p className="dim" style={{ marginTop: 6 }}>
              正在导入并重建数据库…
            </p>
          )}
          {importState.phase === "done" && (
            <p className="fineprint" style={{ marginTop: 6, color: "var(--ok)" }}>
              {importState.messageZh}
            </p>
          )}
          {importState.phase === "error" && (
            <p className="notice" style={{ marginTop: 6 }}>
              {importState.messageZh}
            </p>
          )}
        </div>

        <div className="status-card">
          <h2>错误日志（最近 20 条）</h2>
          {errors.length === 0 ? (
            <p className="dim" style={{ margin: 0 }}>
              没有记录到错误。🎉
            </p>
          ) : (
            <>
              <ul className="engine-list">
                {errors.map((entry, index) => (
                  <li key={`${entry.timestamp}-${index}`}>
                    <span>
                      [{entry.module}] {entry.type}: {entry.message}
                    </span>
                    <small>{new Date(entry.timestamp).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="linklike"
                onClick={() => void clearErrorLog().then(() => setErrors([]))}
              >
                清空错误日志
              </button>
            </>
          )}
          <p className="fineprint" style={{ margin: "6px 0 0" }}>
            仅记录模块/类型/截断的技术消息（≤200 字符），不含用户内容。
          </p>
        </div>

        <div className="status-card">
          <h2>AI 增强层</h2>
          <div className="status-line">
            <span className="label">状态</span>
            <span className="badge info">
              {aiAvailability.state === "unconfigured" ? "未配置" : aiAvailability.state}
            </span>
          </div>
          {aiAvailability.state === "unconfigured" && (
            <p style={{ margin: "6px 0 0", color: "var(--text-dim)", fontSize: "0.85rem" }}>
              {aiAvailability.reasonZh}
            </p>
          )}
        </div>

        <div className="status-card">
          <h2>
            模块进度{" "}
            <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>
              （{implementedCount}/{ENGINE_REGISTRY.length} 已开工）
            </span>
          </h2>
          {[learningAndAi, infrastructure].map((group, groupIndex) => (
            <ul className="engine-list" key={groupIndex}>
              {group.map((engine) => (
                <li key={engine.id}>
                  <span>
                    <span className="name-zh">{engine.nameZh}</span>{" "}
                    <span className="name-en">{engine.nameEn}</span>
                  </span>
                  <span className={badgeClass(engine.status)}>{STATUS_LABEL_ZH[engine.status]}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      <a href="#/" role="button" className="btn btn-block">
        ← 返回首页
      </a>
    </div>
  );
}
