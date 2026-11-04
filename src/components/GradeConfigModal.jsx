import React, { useState, useEffect } from "react";
import { X, Save, Sliders, Sun, Moon, Palette, Check, Sparkles, Info } from "lucide-react";
import clsx from "clsx";
import { useTheme } from "../context/ThemeContext";

export default function GradeConfigModal({
  isOpen,
  onClose,
  config = {},
  onSaveConfig,
}) {
  const [localConfig, setLocalConfig] = useState(config);
  const [activeTab, setActiveTab] = useState("weights");
  const { theme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(theme);

  useEffect(() => {
    if (isOpen && config) {
      setLocalConfig(JSON.parse(JSON.stringify(config)));
      setSelectedTheme(theme);
    }
  }, [isOpen, config, theme]);

  if (!isOpen || !localConfig) return null;

  const weights = localConfig.weights || {};
  const trans = localConfig.transmutation || {};

  const handleWeightChange = (key, val) => {
    const num = Math.max(0, Math.min(100, Number(val) || 0)) / 100;
    setLocalConfig((prev) => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: num,
      },
    }));
  };

  const handleTransChange = (key, val) => {
    const num = Number(val) || 0;
    setLocalConfig((prev) => ({
      ...prev,
      transmutation: {
        ...prev.transmutation,
        [key]: num,
      },
    }));
  };

  const handleSave = () => {
    if (selectedTheme !== theme) {
      setTheme(selectedTheme);
    }
    onSaveConfig(localConfig);
    onClose();
  };

  const handleCancel = () => {
    setSelectedTheme(theme);
    onClose();
  };

  const totalWeightPercent = Math.round(
    ((Number(weights.me) || 0) +
      (Number(weights.quiz) || 0) +
      (Number(weights.rec) || 0) +
      (Number(weights.dep) || 0) +
      (Number(weights.att) || 0)) *
    100
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-slate-800 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-lg">Grading System Configuration</h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 hover:bg-slate-700 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-850">
          <button
            onClick={() => setActiveTab("weights")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeTab === "weights"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
          >
            Percentage Weights
          </button>
          <button
            onClick={() => setActiveTab("transmutation")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activeTab === "transmutation"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
          >
            Transmutation Ratings
          </button>
          <button
            onClick={() => setActiveTab("appearance")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${activeTab === "appearance"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
          >
            Appearance
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
          {activeTab === "weights" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Adjust percentage weights assigned to each assessment category. The total must equal 100%.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    Major Exam (ME)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={Math.round((Number(weights.me) || 0) * 100)}
                      onChange={(e) => handleWeightChange("me", e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-sm font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    Quizzes / Labs (Q)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={Math.round((Number(weights.quiz) || 0) * 100)}
                      onChange={(e) => handleWeightChange("quiz", e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-sm font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    Recitation (R)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={Math.round((Number(weights.rec) || 0) * 100)}
                      onChange={(e) => handleWeightChange("rec", e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-sm font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    Deportment (D)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={Math.round((Number(weights.dep) || 0) * 100)}
                      onChange={(e) => handleWeightChange("dep", e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-sm font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">
                    Attendance (A)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={Math.round((Number(weights.att) || 0) * 100)}
                      onChange={(e) => handleWeightChange("att", e.target.value)}
                      className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-3 py-1.5 text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-sm font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Total Sum:</span>
                <span
                  className={`text-sm font-extrabold ${totalWeightPercent === 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500"
                    }`}
                >
                  {totalWeightPercent}% {totalWeightPercent !== 100 && "(Must equal 100%)"}
                </span>
              </div>
            </div>
          )}

          {activeTab === "transmutation" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure transmutation upper/lower scaling boundaries for continuous ratings.
              </p>

              <div className="space-y-3">
                {/* Major Exam Bounds */}
                <div className="p-3 bg-sky-50/60 dark:bg-sky-950/30 rounded-xl border border-sky-100 dark:border-sky-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-sky-900 dark:text-sky-300 block">Major Exam Rating (MER)</span>
                    <span className="text-[11px] text-sky-700 dark:text-sky-400">Formula standard: 100 max, 50 min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={trans.mer_high || 100}
                      onChange={(e) => handleTransChange("mer_high", e.target.value)}
                      className="w-14 text-center border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-xs font-bold"
                      title="Highest"
                    />
                    <span className="text-xs text-slate-400">-</span>
                    <input
                      type="number"
                      value={trans.mer_low || 50}
                      onChange={(e) => handleTransChange("mer_low", e.target.value)}
                      className="w-14 text-center border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-xs font-bold"
                      title="Lowest"
                    />
                  </div>
                </div>

                {/* Quiz Bounds */}
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-amber-900 dark:text-amber-300 block">Quiz Rating (QR)</span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400">Formula standard: 100 max, 50 min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={trans.qr_high || 100}
                      onChange={(e) => handleTransChange("qr_high", e.target.value)}
                      className="w-14 text-center border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-xs font-bold"
                      title="Highest"
                    />
                    <span className="text-xs text-slate-400">-</span>
                    <input
                      type="number"
                      value={trans.qr_low || 50}
                      onChange={(e) => handleTransChange("qr_low", e.target.value)}
                      className="w-14 text-center border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-xs font-bold"
                      title="Lowest"
                    />
                  </div>
                </div>

                {/* Recitation Bounds */}
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-emerald-900 dark:text-emerald-300 block">Recitation Rating (RR)</span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400">Formula standard: 100 max, 50 min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={trans.rec_high || 100}
                      onChange={(e) => handleTransChange("rec_high", e.target.value)}
                      className="w-14 text-center border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-xs font-bold"
                      title="Highest"
                    />
                    <span className="text-xs text-slate-400">-</span>
                    <input
                      type="number"
                      value={trans.rec_low || 50}
                      onChange={(e) => handleTransChange("rec_low", e.target.value)}
                      className="w-14 text-center border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-xs font-bold"
                      title="Lowest"
                    />
                  </div>
                </div>

                {/* Deportment Bounds */}
                <div className="p-3 bg-orange-50/60 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-orange-900 dark:text-orange-300 block">Deportment Rating (DR)</span>
                    <span className="text-[11px] text-orange-700 dark:text-orange-400">Formula standard: 95 max, 70 min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={trans.dep_high || 95}
                      onChange={(e) => handleTransChange("dep_high", e.target.value)}
                      className="w-14 text-center border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-xs font-bold"
                      title="Highest"
                    />
                    <span className="text-xs text-slate-400">-</span>
                    <input
                      type="number"
                      value={trans.dep_low || 70}
                      onChange={(e) => handleTransChange("dep_low", e.target.value)}
                      className="w-14 text-center border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-xs font-bold"
                      title="Lowest"
                    />
                  </div>
                </div>

                {/* Attendance Bounds */}
                <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-rose-900 dark:text-rose-300 block">Attendance Rating (AR)</span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-400">Formula standard: 95 max, 70 min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={trans.att_high || 95}
                      onChange={(e) => handleTransChange("att_high", e.target.value)}
                      className="w-14 text-center border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-xs font-bold"
                      title="Highest"
                    />
                    <span className="text-xs text-slate-400">-</span>
                    <input
                      type="number"
                      value={trans.att_low || 70}
                      onChange={(e) => handleTransChange("att_low", e.target.value)}
                      className="w-14 text-center border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 text-xs font-bold"
                      title="Lowest"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/40">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Visual Theme Preferences
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Choose your preferred workspace theme. Click &quot;Save Configuration&quot; below to apply your changes.
                </p>
              </div>

              {/* Theme Pending Notification */}
              {selectedTheme !== theme && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 animate-in fade-in">
                  <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Theme change pending ({selectedTheme === "dark" ? "Dark Mode" : "Light Mode"} selected). Click <strong>&quot;Save Configuration&quot;</strong> below to apply it.
                  </span>
                </div>
              )}

              {/* Theme Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Light Theme Card */}
                <div
                  onClick={() => setSelectedTheme("light")}
                  className={clsx(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none",
                    selectedTheme === "light"
                      ? "border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850/60 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center">
                      <Sun className="w-5 h-5 text-amber-500" />
                    </div>
                    {selectedTheme === "light" && (
                      <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                        <Check className="w-3 h-3" /> {theme === "light" ? "Active" : "Selected"}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Light Mode
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Bright, high-clarity background ideal for well-lit classrooms and daytime grading.
                    </p>
                  </div>
                </div>

                {/* Dark Theme Card */}
                <div
                  onClick={() => setSelectedTheme("dark")}
                  className={clsx(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between select-none",
                    selectedTheme === "dark"
                      ? "border-emerald-600 bg-emerald-950/30 shadow-xs"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850/60 hover:border-slate-300 dark:hover:border-slate-700"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center justify-center">
                      <Moon className="w-5 h-5 text-indigo-400" />
                    </div>
                    {selectedTheme === "dark" && (
                      <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                        <Check className="w-3 h-3" /> {theme === "dark" ? "Active" : "Selected"}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      Dark Mode
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Deep midnight tones optimized for reduced eye strain during evening workflows.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {selectedTheme !== theme ? "Theme change staged • Click Save to apply" : "Weights & settings saved to database"}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
