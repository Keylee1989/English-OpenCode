import { useEffect, useState } from "react";
import {
  completeOnboarding,
  getOnboardingProgress,
  saveOnboardingStep,
} from "@/study/onboarding/onboarding-state";

/**
 * Phase 13 P0-2: First Launch Flow - three steps shown once, before the
 * daily content, to set expectations and reduce Day-1 drop-off:
 *   Step 1: the goal (functional conversation in ~6 months)
 *   Step 2: daily commitment (30-60 minutes)
 *   Step 3: what today's session will contain
 * Finishing writes onboarding-completed = true. Pure UI; no learning logic.
 */
export function OnboardingCard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getOnboardingProgress().then((progress) => {
      setStep(Math.min(3, Math.max(1, progress.step + (progress.completed ? 3 : 1))));
      setReady(true);
    });
  }, []);

  const next = async (): Promise<void> => {
    if (step < 3) {
      const nextStep = step + 1;
      setStep(nextStep);
      await saveOnboardingStep(nextStep - 1);
    } else {
      await completeOnboarding();
      onDone();
    }
  };

  if (!ready) return null;

  return (
    <div className="card" aria-label="新手引导">
      <p className="step-progress">
        欢迎加入 English360 · {step}/3
      </p>

      {step === 1 && (
        <>
          <h2>你的目标 🎯</h2>
          <p>
            坚持 6 个月，达到<strong>可以正常交流</strong>的水平：
            听懂日常对话、表达观点、应对美国生活的真实场景。
          </p>
          <p className="dim">
            课程共 360 天，当前已上线前 180 天。每一天都是真实场景，不是语法书。
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <h2>每天学习 ⏰</h2>
          <p>
            建议每天 <strong>30–60 分钟</strong>：新课 + 复习 + 练习一次完成。
            连续比时长更重要——系统会自动安排到期复习。
          </p>
          <p className="dim">中断了也没关系，回来继续就行，进度不会丢。</p>
        </>
      )}

      {step === 3 && (
        <>
          <h2>今天你会完成 ✅</h2>
          <ul className="task-list">
            {[
              ["词汇", "5 个生词卡 + 发音与例句"],
              ["听力", "听音辨词与听句判断"],
              ["口语", "跟读自评（可录音回放）"],
              ["阅读", "短文精读"],
              ["复习", "按记忆曲线到期的旧词"],
            ].map(([name, desc]) => (
              <li key={name} className="task-row">
                <span className="task-main">
                  <strong>{name}</strong>
                  <small>{desc}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="dim">写作任务会在部分天出现；每个阶段结束还有能力测评。</p>
        </>
      )}

      <button type="button" className="btn btn-primary btn-block" onClick={() => void next()}>
        {step < 3 ? "下一步" : "开始 Day 1"}
      </button>
    </div>
  );
}
