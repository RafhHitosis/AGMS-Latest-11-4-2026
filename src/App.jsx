import React, { useState } from "react";
import SectionSelection from "./components/SectionSelection";
import AttendancePage from "./pages/AttendancePage";
import GradingPage from "./pages/GradingPage";
import { ThemeProvider } from "./context/ThemeContext";
import AuthGate from "./components/AuthGate";

function MainContent({ activeSection, activeTool, onSelectTool, onBack, onSignOut }) {
  const handleBack = () => {
    onBack();
  };

  const handleSwitchTool = (newTool) => {
    onSelectTool(activeSection, newTool);
  };

  if (activeSection && activeTool === "attendance") {
    return (
      <AttendancePage
        sectionId={activeSection}
        onBack={handleBack}
        onSignOut={onSignOut}
        onSwitchToGrading={() => handleSwitchTool("grading")}
      />
    );
  }

  if (activeSection && activeTool === "grading") {
    return (
      <GradingPage
        sectionId={activeSection}
        onBack={handleBack}
        onSignOut={onSignOut}
        onSwitchToAttendance={() => handleSwitchTool("attendance")}
      />
    );
  }

  return (
    <SectionSelection
      onSelectTool={onSelectTool}
      onSignOut={onSignOut}
    />
  );
}

function App() {
  const [activeSection, setActiveSection] = useState(null);
  const [activeTool, setActiveTool] = useState(null);

  const handleSelectTool = (section, tool) => {
    setActiveSection(section);
    setActiveTool(tool);
  };

  const handleBack = () => {
    setActiveSection(null);
    setActiveTool(null);
  };

  return (
    <ThemeProvider>
      <AuthGate>
        {({ requestSignOut }) => (
          <MainContent
            activeSection={activeSection}
            activeTool={activeTool}
            onSelectTool={handleSelectTool}
            onBack={handleBack}
            onSignOut={requestSignOut}
          />
        )}
      </AuthGate>
    </ThemeProvider>
  );
}

export default App;
