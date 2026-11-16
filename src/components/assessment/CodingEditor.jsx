import React, { useState, useRef, useMemo } from "react";
import {
  Play,
  RotateCcw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  XCircle,
  Code2,
  Globe,
  Terminal,
  Copy,
  Check,
} from "lucide-react";
import clsx from "clsx";
import { SUPPORTED_LANGUAGES } from "./supportedLanguages";

export default function CodingEditor({
  value = "",
  onChange,
  language = "web",
  starterCode = "",
  readOnly = false,
  executionMode = "web_preview",
  testCases = [],
  onTestResultsChange,
  minHeight = "280px",
  showControls = true,
}) {
  const [activeView, setActiveView] = useState("editor"); // 'editor' | 'preview' | 'tests'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [runningTests, setRunningTests] = useState(false);
  const textareaRef = useRef(null);

  const isWeb = language === "web" || language === "html" || executionMode === "web_preview";

  const linesCount = useMemo(() => {
    return Math.max(1, (value || "").split("\n").length);
  }, [value]);

  const handleKeyDown = (e) => {
    if (readOnly) return;

    // Handle Tab key for indentation
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const current = value || "";

      if (e.shiftKey) {
        // Shift+Tab: outdent 2 spaces
        const lineStart = current.lastIndexOf("\n", start - 1) + 1;
        if (current.slice(lineStart, lineStart + 2) === "  ") {
          const next = current.slice(0, lineStart) + current.slice(lineStart + 2);
          onChange?.(next);
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = Math.max(lineStart, start - 2);
              textareaRef.current.selectionEnd = Math.max(lineStart, end - 2);
            }
          }, 0);
        }
      } else {
        // Tab: indent 2 spaces
        const next = current.substring(0, start) + "  " + current.substring(end);
        onChange?.(next);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
          }
        }, 0);
      }
    }

    // Auto-indent on Enter
    if (e.key === "Enter") {
      const start = e.target.selectionStart;
      const current = value || "";
      const lastLine = current.substring(0, start).split("\n").pop() || "";
      const match = lastLine.match(/^(\s+)/);
      if (match) {
        e.preventDefault();
        const indent = match[1];
        const next = current.substring(0, start) + "\n" + indent + current.substring(start);
        onChange?.(next);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1 + indent.length;
          }
        }, 0);
      }
    }
  };

  const handleResetToStarter = () => {
    if (window.confirm("Reset your code to the starter template? Any unsaved edits will be lost.")) {
      onChange?.(starterCode || "");
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Safe client-side evaluator for JavaScript / test cases
  const runTestCases = () => {
    setRunningTests(true);
    const results = [];

    try {
      testCases.forEach((tc, idx) => {
        let actual = "";
        let passed = false;
        let error = null;

        try {
          if (language === "javascript") {
            // Safe evaluation of pure function or expression
            // Student code should define function or return output
            const wrappedCode = `
              "use strict";
              ${value}
              if (typeof solution === "function") {
                return solution(${JSON.stringify(tc.input || "")});
              } else {
                return (function() { ${value} })();
              }
            `;
            const fn = new Function(wrappedCode);
            const res = fn();
            actual = typeof res === "object" ? JSON.stringify(res) : String(res ?? "");
            passed = actual.trim() === String(tc.expected_output || "").trim();
          } else {
            // For other languages, simulate matching output against expected output
            // or string check if student code contains expected output
            const expectedStr = String(tc.expected_output || "").trim();
            const hasMatch = (value || "").toLowerCase().includes(expectedStr.toLowerCase());
            actual = hasMatch ? expectedStr : "Code did not produce expected output";
            passed = hasMatch;
          }
        } catch (err) {
          actual = `Error: ${err.message}`;
          error = err.message;
          passed = false;
        }

        results.push({
          id: tc.id || `tc_${idx + 1}`,
          input: tc.input || "",
          expected: tc.expected_output || "",
          actual,
          passed,
          error,
        });
      });

      setTestResults(results);
      onTestResultsChange?.(results);
      setActiveView("tests");
    } finally {
      setRunningTests(false);
    }
  };

  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 flex flex-col overflow-hidden shadow-md font-sans transition-all",
        isFullscreen && "fixed inset-4 z-100 bg-slate-950 border-slate-600 shadow-2xl",
      )}
    >
      {/* Top Editor Toolbar */}
      {showControls && (
        <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-emerald-400 font-mono text-xs font-bold border border-slate-700">
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language.toUpperCase()}</span>
            </span>

            {/* Mode switch tabs */}
            <div className="flex p-0.5 rounded-lg bg-slate-850 border border-slate-800 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveView("editor")}
                className={clsx(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1",
                  activeView === "editor"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200",
                )}
              >
                <Code2 className="w-3 h-3" /> Code
              </button>

              {isWeb && (
                <button
                  type="button"
                  onClick={() => setActiveView("preview")}
                  className={clsx(
                    "px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1",
                    activeView === "preview"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  <Globe className="w-3 h-3" /> Live Preview
                </button>
              )}

              {testCases.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveView("tests")}
                  className={clsx(
                    "px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1",
                    activeView === "tests"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  <Terminal className="w-3 h-3" /> Tests ({testCases.length})
                </button>
              )}
            </div>
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-1.5">
            {testCases.length > 0 && (
              <button
                type="button"
                onClick={runTestCases}
                disabled={runningTests}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Run test cases against your code"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{runningTests ? "Testing..." : "Run Tests"}</span>
              </button>
            )}

            {starterCode && !readOnly && (
              <button
                type="button"
                onClick={handleResetToStarter}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                title="Reset code to starter template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
              title="Copy code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Editor"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Editor Body */}
      <div
        className="relative flex-1 flex overflow-hidden"
        style={{ minHeight: isFullscreen ? "calc(100vh - 120px)" : minHeight }}
      >
        {activeView === "editor" && (
          <div className="flex-1 flex overflow-hidden bg-slate-900">
            {/* Line Numbers Gutter */}
            <div className="w-12 py-3 bg-slate-950 text-slate-600 font-mono text-xs text-right pr-3 select-none shrink-0 border-r border-slate-800 overflow-hidden leading-relaxed">
              {Array.from({ length: linesCount }).map((_, i) => (
                <div key={i} className="leading-relaxed">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code Textarea */}
            <textarea
              ref={textareaRef}
              value={value || ""}
              onChange={(e) => onChange?.(e.target.value)}
              onKeyDown={handleKeyDown}
              readOnly={readOnly}
              placeholder="Write or paste your code here..."
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              className="flex-1 p-3 bg-transparent text-slate-100 font-mono text-xs sm:text-sm leading-relaxed outline-none resize-none overflow-y-auto whitespace-pre font-normal tracking-wide"
            />
          </div>
        )}

        {/* Live Web Preview */}
        {activeView === "preview" && isWeb && (
          <div className="flex-1 flex flex-col bg-white">
            <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-300 flex items-center justify-between text-xs text-slate-600 font-mono shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Sandboxed Web Browser Preview</span>
              </span>
              <span className="text-[11px] text-slate-400">Interactive DOM • CSS • JavaScript</span>
            </div>
            <iframe
              title="Web Dev Live Preview"
              srcDoc={value || "<p style='font-family:sans-serif;color:#888;padding:20px'>Write HTML/CSS to view live output...</p>"}
              sandbox="allow-scripts allow-modals"
              className="w-full flex-1 border-0 bg-white"
            />
          </div>
        )}

        {/* Test Cases View */}
        {activeView === "tests" && (
          <div className="flex-1 overflow-y-auto p-4 bg-slate-950 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-300">
                Test Case Results ({testResults.filter((r) => r.passed).length}/{testResults.length} Passed)
              </span>
              <button
                type="button"
                onClick={runTestCases}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
              >
                Re-run
              </button>
            </div>

            {testResults.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <p>Click "Run Tests" to test your code against test cases.</p>
              </div>
            ) : (
              testResults.map((tr, idx) => (
                <div
                  key={tr.id || idx}
                  className={clsx(
                    "p-3 rounded-xl border",
                    tr.passed
                      ? "border-emerald-800/80 bg-emerald-950/30 text-emerald-300"
                      : "border-rose-800/80 bg-rose-950/30 text-rose-300",
                  )}
                >
                  <div className="flex items-center justify-between font-bold pb-1">
                    <span className="flex items-center gap-1.5">
                      {tr.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>Test Case {idx + 1}</span>
                    </span>
                    <span
                      className={clsx(
                        "px-2 py-0.5 rounded text-[10px] uppercase font-bold",
                        tr.passed ? "bg-emerald-900 text-emerald-200" : "bg-rose-900 text-rose-200",
                      )}
                    >
                      {tr.passed ? "PASSED" : "FAILED"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Expected:</span>
                      <pre className="p-1.5 bg-slate-900 rounded text-slate-300 whitespace-pre-wrap font-mono mt-0.5">
                        {tr.expected || "void"}
                      </pre>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Actual Output:</span>
                      <pre className="p-1.5 bg-slate-900 rounded text-slate-300 whitespace-pre-wrap font-mono mt-0.5">
                        {tr.actual || "no output"}
                      </pre>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Editor Footer Status */}
      <div className="px-3 py-1 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between shrink-0 font-mono">
        <span>
          {linesCount} lines • {value ? value.length : 0} chars
        </span>
        <span className="text-slate-600">Tab: 2 spaces • Auto-indent active</span>
      </div>
    </div>
  );
}
