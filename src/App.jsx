import React, { useState } from "react";
import SectionSelection from "./components/SectionSelection";
import AttendancePage from "./pages/AttendancePage";
import GradingPage from "./pages/GradingPage";
import { ThemeProvider } from "./context/ThemeContext";
import AuthGate from "./components/AuthGate";

function MainContent() {
  const [activeSection, setActiveSection] = useState(null);
  const [activeTool, setActiveTool] = useState(null); // 'attendance' | 'grading' | null

  const handleBack = () => {
    setActiveSection(null);
    setActiveTool(null);
  };

  const handleSwitchTool = (newTool) => {
    setActiveTool(newTool);
  };

  if (activeSection && activeTool === "attendance") {
    return (
      <AttendancePage
        sectionId={activeSection}
        onBack={handleBack}
        onSwitchToGrading={() => handleSwitchTool("grading")}
      />
    );
  }

  if (activeSection && activeTool === "grading") {
    return (
      <GradingPage
        sectionId={activeSection}
        onBack={handleBack}
        onSwitchToAttendance={() => handleSwitchTool("attendance")}
      />
    );
  }

  return (
    <SectionSelection
      onSelectTool={(section, tool) => {
        setActiveSection(section);
        setActiveTool(tool);
      }}
    />
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthGate>
        <MainContent />
      </AuthGate>
    </ThemeProvider>
  );
}

export default App;
