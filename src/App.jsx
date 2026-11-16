import React, { lazy, Suspense, useState, useMemo } from "react";
import SectionSelection from "./components/SectionSelection";
import { ThemeProvider } from "./context/ThemeContext";
import ToastProvider from "./context/ToastProvider";
import AuthGate from "./components/AuthGate";
import StudentAssessmentPage from "./pages/StudentAssessmentPage.jsx";

const AttendancePage = lazy(() => import("./pages/AttendancePage.jsx"));
const GradingPage = lazy(() => import("./pages/GradingPage.jsx"));
const AssessmentPage = lazy(() => import("./pages/AssessmentPage.jsx"));

function LoadingScreen() {
  return (
    <div
      className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-950"
      role="status"
      aria-label="Loading"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
    </div>
  );
}

function MainContent({
  activeSection,
  activeTool,
  onSelectTool,
  onBack,
  onSignOut,
  currentUser,
  acknowledgeWelcome,
  saveAdminRecoveryQuestions,
}) {
  const handleBack = () => {
    onBack();
  };

  const handleSwitchTool = (newTool) => {
    onSelectTool(activeSection, newTool);
  };

  if (activeSection && activeTool === "attendance") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AttendancePage
          sectionId={activeSection}
          currentUser={currentUser}
          onBack={handleBack}
          onSignOut={onSignOut}
          onSwitchToGrading={() => handleSwitchTool("grading")}
          onSwitchToAssessments={() => handleSwitchTool("assessments")}
        />
      </Suspense>
    );
  }

  if (activeSection && activeTool === "grading") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <GradingPage
          sectionId={activeSection}
          currentUser={currentUser}
          onBack={handleBack}
          onSignOut={onSignOut}
          onSwitchToAttendance={() => handleSwitchTool("attendance")}
          onSwitchToAssessments={() => handleSwitchTool("assessments")}
        />
      </Suspense>
    );
  }

  if (activeSection && activeTool === "assessments") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AssessmentPage
          sectionId={activeSection}
          currentUser={currentUser}
          onBack={handleBack}
          onSignOut={onSignOut}
          onSwitchToAttendance={() => handleSwitchTool("attendance")}
          onSwitchToGrading={() => handleSwitchTool("grading")}
        />
      </Suspense>
    );
  }

  return (
    <SectionSelection
      onSelectTool={onSelectTool}
      onSignOut={onSignOut}
      currentUser={currentUser}
      onAcknowledgeWelcome={acknowledgeWelcome}
      onSaveAdminRecoveryQuestions={saveAdminRecoveryQuestions}
    />
  );
}

function App() {
  const [activeSection, setActiveSection] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [enteredAssessmentCode, setEnteredAssessmentCode] = useState("");

  // Check if student access link (?take=CODE or ?assessment=CODE)
  const studentAccessCode = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("take") || params.get("assessment");
  }, []);

  const handleSelectTool = (section, tool) => {
    setActiveSection(section);
    setActiveTool(tool);
  };

  const handleBack = () => {
    setActiveSection(null);
    setActiveTool(null);
  };

  // If a student access link is provided, render student taking portal directly without auth
  const currentStudentAccessCode = studentAccessCode || enteredAssessmentCode;
  if (currentStudentAccessCode) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <StudentAssessmentPage
            accessCode={currentStudentAccessCode}
            onExit={() => {
              setEnteredAssessmentCode("");
              if (studentAccessCode) window.location.search = "";
            }}
          />
        </ToastProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthGate onTakeAssessment={setEnteredAssessmentCode}>
          {({ requestSignOut, currentUser, acknowledgeWelcome, saveAdminRecoveryQuestions }) => (
            <MainContent
              activeSection={activeSection}
              activeTool={activeTool}
              onSelectTool={handleSelectTool}
              onBack={handleBack}
              onSignOut={requestSignOut}
              currentUser={currentUser}
              acknowledgeWelcome={acknowledgeWelcome}
              saveAdminRecoveryQuestions={saveAdminRecoveryQuestions}
            />
          )}
        </AuthGate>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
