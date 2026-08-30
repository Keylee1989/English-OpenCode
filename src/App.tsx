import { lazy, Suspense } from "react";
import { useHashRoute } from "@/router";
import HomePage from "@/pages/HomePage";
import ThemeToggle from "@/components/ThemeToggle";
import { stopSpeaking } from "@/speech/tts";

// Phase 12 P0-4: route-level code splitting keeps the entry bundle small.
// HomePage stays static for instant first paint; everything else is on demand.
const StudyPage = lazy(() => import("@/pages/StudyPage"));
const ReportPage = lazy(() => import("@/pages/ReportPage"));
const StatusPage = lazy(() => import("@/pages/StatusPage"));
const AiTutorPage = lazy(() => import("@/pages/AiTutorPage"));
const AiSettingsPage = lazy(() => import("@/pages/AiSettingsPage"));
const AiHistoryPage = lazy(() => import("@/pages/AiHistoryPage"));
const LearningDashboardPage = lazy(() => import("@/study/analytics/LearningDashboard"));
const LibraryPage = lazy(() => import("@/pages/LibraryPage"));
const DiagnosisPage = lazy(() => import("@/pages/DiagnosisPage"));
const LearningValidationPage = lazy(() => import("@/pages/LearningValidationPage"));

function PageFallback() {
  return (
    <div className="page">
      <p className="dim">加载中…</p>
    </div>
  );
}

export default function App() {
  const [route, navigate] = useHashRoute();

  return (
    <div className="app-shell">
      <ThemeToggle />
      <main>
        {route === "home" && <HomePage onStart={() => navigate("/study")} />}
        {route !== "home" && (
          <Suspense fallback={<PageFallback />}>
            {route === "study" && (
              <StudyPage
                onExit={() => {
                  stopSpeaking();
                  navigate("/");
                }}
              />
            )}
            {route === "report" && <ReportPage />}
            {route === "status" && <StatusPage />}
            {route === "tutor" && (
              <AiTutorPage
                onBack={() => {
                  stopSpeaking();
                  navigate("/");
                }}
              />
            )}
            {route === "aisettings" && <AiSettingsPage />}
            {route === "aihistory" && <AiHistoryPage />}
            {route === "analytics" && <LearningDashboardPage />}
            {route === "library" && <LibraryPage />}
            {route === "diagnosis" && <DiagnosisPage />}
            {route === "validate" && <LearningValidationPage />}
          </Suspense>
        )}
      </main>

      <nav className="bottom-nav" aria-label="主导航">
        <a href="#/" aria-current={route === "home" ? "page" : undefined}>
          学习
        </a>
        <a href="#/tutor" aria-current={route === "tutor" ? "page" : undefined}>
          导师
        </a>
        <a href="#/report" aria-current={route === "report" ? "page" : undefined}>
          报告
        </a>
        <a href="#/analytics" aria-current={route === "analytics" ? "page" : undefined}>
          分析
        </a>
        <a href="#/diagnosis" aria-current={route === "diagnosis" ? "page" : undefined}>
          诊断
        </a>
        <a href="#/aihistory" aria-current={route === "aihistory" ? "page" : undefined}>
          历史
        </a>
        <a href="#/library" aria-current={route === "library" ? "page" : undefined}>
          资源库
        </a>
        <a href="#/validate" aria-current={route === "validate" ? "page" : undefined}>
          校验
        </a>
        <a href="#/status" aria-current={route === "status" ? "page" : undefined}>
          状态
        </a>
        <a href="#/aisettings" aria-current={route === "aisettings" ? "page" : undefined}>
          AI 设置
        </a>
      </nav>
    </div>
  );
}
