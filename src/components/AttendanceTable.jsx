import React, { useMemo, useState, useRef, useEffect } from "react";
import { format, isSameDay, isToday, isSunday, isSaturday } from "date-fns";
import { groupDatesByMonth, chunkDates } from "../utils/dateUtils";
import { isDateHoliday } from "../utils/holidays";
import clsx from "clsx";
import { Plus, User, Trash2, MoreVertical, Edit } from "lucide-react";

export default function AttendanceTable({
  dates,
  students,
  attendance,
  toggleAttendance,
  addStudent,
  deleteStudent,
  editStudent,
  stats,
  sectionId,
  customHolidays,
  totalSchoolDays,
  schedules, // NEW PROP
}) {
  const [newStudentName, setNewStudentName] = useState("");
  const hoverStatusRef = useRef(null); // Ref for status bar

  // Pre-process columns
  const monthGroups = useMemo(() => groupDatesByMonth(dates), [dates]);
  const monthKeys = Object.keys(monthGroups);

  // Calculate pairs for each month
  const monthColumns = useMemo(() => {
    return monthKeys.map((month) => ({
      name: month,
      pairs: chunkDates(monthGroups[month], 2),
    }));
  }, [monthGroups, monthKeys]);

  // Pre-compute date statuses (Blockers, Holidays, Weekends) for O(1) lookups during render
  const dateMetadata = useMemo(() => {
    const meta = {};
    dates.forEach((date) => {
      if (!date) return;
      const day = date.getDay();
      const schedule = schedules?.[sectionId];
      const key = format(date, "yyyy-MM-dd");

      // Check Holiday (stored in PostgreSQL)
      const hol = isDateHoliday(date, customHolidays);
      if (hol.isHoliday) {
        meta[key] = { isBlocked: true, reason: hol.name, isHoliday: true, holConfig: hol };
        return;
      }

      // Keep weekends blocked by default until the section has an explicit schedule.
      if ((!Array.isArray(schedule) && (isSunday(date) || isSaturday(date)))) {
        meta[key] = { isBlocked: true, reason: "Weekend" };
        return;
      }

      // Check Schedule Config from PostgreSQL (e.g. [1, 2, 3, 4])
      if (schedule && Array.isArray(schedule)) {
        if (!schedule.includes(day)) {
          meta[key] = { isBlocked: true, reason: "No Class (Sched)" };
          return;
        }
      }

      meta[key] = { isBlocked: false };
    });
    return meta;
  }, [dates, schedules, sectionId, customHolidays]);

  const handleSubmitStudent = (e) => {
    e.preventDefault();
    if (newStudentName.trim()) {
      addStudent(newStudentName.trim());
      setNewStudentName("");
    }
  };

  const updateHoverStatus = (text) => {
    if (hoverStatusRef.current) {
      hoverStatusRef.current.textContent = text || "No cell selected";
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 relative">
      <div className="flex-1 overflow-auto relative shadow-inner">
        <table className="min-w-full border-collapse border-spacing-0 bg-white dark:bg-slate-900 text-sm">
          {/* Calendar Header */}
          <thead className="sticky top-0 z-20 shadow-sm font-semibold">
            {/* Row 1: Months */}
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
              <th className="sticky left-0 top-0 z-30 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 w-12 min-w-[3rem] p-0 text-center h-[34px] font-bold">
                NoS
              </th>
              <th className="sticky left-12 top-0 z-30 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 min-w-[200px] text-left px-4 h-[34px] font-bold">
                NAME
              </th>
              {monthColumns.map((group) => (
                <th
                  key={group.name}
                  colSpan={group.pairs.length}
                  className="sticky top-0 z-20 h-[34px] text-center py-2 border border-slate-300 dark:border-slate-700 uppercase tracking-wider text-xs bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100"
                >
                  {group.name}
                </th>
              ))}
              <th className="sticky right-0 top-0 z-30 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 w-24 p-2 text-center text-xs font-bold text-slate-800 dark:text-slate-100 h-[34px]">
                AT
              </th>
            </tr>

            {/* Row 2: Date Pairs */}
            <tr className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-200">
              <th className="sticky left-0 top-[34px] z-30 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 text-center align-middle">
                <span className="text-[13px] font-bold text-slate-400 dark:text-slate-400">
                  {students.length}
                </span>
              </th>
              <th className="sticky left-12 top-[34px] z-30 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 p-2">
                <form onSubmit={handleSubmitStudent} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add student..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                  />
                  <button
                    type="submit"
                    aria-label="Add student"
                    title="Add student"
                    className="flex shrink-0 items-center justify-center rounded bg-emerald-600 p-1.5 text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </button>
                </form>
              </th>

              {monthColumns.map((group) =>
                group.pairs.map((pair, idx) => {
                  const key1 = pair[0] ? format(pair[0], "yyyy-MM-dd") : null;
                  const key2 = pair[1] ? format(pair[1], "yyyy-MM-dd") : null;

                  const status1 = key1 ? (dateMetadata[key1] || { isBlocked: false }) : { isBlocked: false };
                  const status2 = key2 ? (dateMetadata[key2] || { isBlocked: false }) : { isBlocked: false };

                  return (
                    <th
                      key={`${group.name}-${idx}`}
                      className="sticky top-[34px] z-20 border border-slate-200 dark:border-slate-700 min-w-[3rem] p-0 align-top bg-white dark:bg-slate-900"
                    >
                      <div className="flex flex-col h-full">
                        {/* Day 1 */}
                        <div
                          className={clsx(
                            "flex-1 flex items-center justify-center py-1 border-b border-slate-200 dark:border-slate-700 text-xs",
                            isToday(pair[0]) &&
                              "bg-emerald-600 text-white font-bold",
                            status1.isHoliday && "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300",
                            status1.isBlocked &&
                              !status1.isHoliday &&
                              "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
                          )}
                          title={`${format(pair[0], "EEEE")}${status1.reason ? ` - ${status1.reason}` : ""}`}
                        >
                          {format(pair[0], "d")}
                        </div>

                        {/* Day 2 */}
                        {pair[1] ? (
                          <div
                            className={clsx(
                              "flex-1 flex items-center justify-center py-1 text-xs",
                              isToday(pair[1]) &&
                                "bg-emerald-600 text-white font-bold",
                              status2.isHoliday && "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300",
                              status2.isBlocked &&
                                !status2.isHoliday &&
                                "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
                            )}
                            title={`${format(pair[1], "EEEE")}${status2.reason ? ` - ${status2.reason}` : ""}`}
                          >
                            {format(pair[1], "d")}
                          </div>
                        ) : (
                          <div className="flex-1 bg-slate-50 dark:bg-slate-850"></div>
                        )}
                      </div>
                    </th>
                  );
                }),
              )}
              <th className="sticky right-0 top-[34px] z-30 bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 p-1">
                <div className="flex flex-col items-center justify-center h-full w-full">
                  <div className="flex-1 w-full flex items-center justify-center border-b border-slate-300 dark:border-slate-700">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[10px]">
                      PRES
                    </span>
                  </div>
                  <div className="flex-1 w-full flex items-center justify-center">
                    <span className="text-[10px] text-red-500 dark:text-red-400 font-bold">
                      ABS
                    </span>
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            {students.length === 0 && (
              <tr>
                <td
                  colSpan={100}
                  className="p-8 text-center text-slate-400 dark:text-slate-500 italic"
                >
                  No students added yet. Add one above.
                </td>
              </tr>
            )}
            {students.map((student, index) => (
              <StudentRow
                key={student.id}
                student={student}
                index={index}
                stats={stats}
                attendance={attendance}
                monthColumns={monthColumns}
                customHolidays={customHolidays}
                sectionId={sectionId}
                totalSchoolDays={totalSchoolDays}
                toggleAttendance={toggleAttendance}
                deleteStudent={deleteStudent}
                editStudent={editStudent}
                schedules={schedules} 
                onHover={updateHoverStatus} 
                dateMetadata={dateMetadata}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Sticky Status Bar */}
      <div className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-sans flex items-center justify-between sticky bottom-0 z-40 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
        {/* Left Sidebar: Dynamic Hover Context */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Cursor Info:</span>
          <span
            ref={hoverStatusRef}
            className="truncate font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800 transition-all duration-200"
          >
            No cell selected
          </span>
        </div>

        {/* Right Sidebar: Meaningful Color Legend */}
        <div className="flex items-center gap-4 shrink-0 ml-4 font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5" title="Unmarked cells are automatically counted as Present">
            <div className="w-3 h-3 rounded-[3px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"></div>
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5" title="Marked as Absent">
            <div className="w-3 h-3 rounded-[3px] bg-red-500 shadow-sm border border-red-600"></div>
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1.5" title="Declared as Holiday">
            <div className="w-3 h-3 rounded-[3px] bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800"></div>
            <span>Holiday</span>
          </div>
          <div className="flex items-center gap-1.5" title="Blocked or No Class">
            <div className="w-3 h-3 rounded-[3px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"></div>
            <span>No Class</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const StudentRow = React.memo(
  ({
    student,
    index,
    stats,
    attendance,
    monthColumns,
    customHolidays,
    sectionId,
    totalSchoolDays,
    toggleAttendance,
    deleteStudent,
    editStudent,
    schedules, 
    onHover, 
    dateMetadata,
  }) => {
    const studentStats = stats.find((s) => s.studentId === student.id) || {
      totalAbsences: 0,
      totalPresent: 0,
    };

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target) &&
          !buttonRef.current.contains(event.target)
        ) {
          setIsMenuOpen(false);
        }
      };

      if (isMenuOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isMenuOpen]);

    const handleMouseEnter = (date) => {
      if (!date) return;
      const dateStr = format(date, "MMM d (EEEE)");
      
      const parts = student.name.split(",");
      let displayName = student.name;
      if (parts.length > 1) {
        const lastName = parts[0];
        const firstName = parts[1].trim().split(" ")[0]; // Get the first word of the first name
        displayName = `${lastName}, ${firstName}`;
      }
      
      onHover(`${displayName} • ${dateStr}`);
    };

    const hasFewDates = useMemo(() => {
      const totalPairs = monthColumns.reduce(
        (sum, g) => sum + (g.pairs?.length || 0),
        0
      );
      return totalPairs <= 2;
    }, [monthColumns]);

    return (
      <tr
        className={clsx(
          "hover:bg-slate-50 dark:hover:bg-slate-800/60 group transition-colors",
          isMenuOpen && "relative z-50"
        )}
      >
        <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400 font-mono group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
          {index + 1}
        </td>
        <td
          className={clsx(
            "sticky left-12 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-200 flex justify-between items-center h-[50px] transition-colors",
            isMenuOpen ? "z-50" : "z-10"
          )}
        >
          <span className="truncate max-w-[150px]" title={student.name}>{student.name}</span>
          <div className="relative ml-2 shrink-0">
            <button
              ref={buttonRef}
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className={clsx(
                "p-1 rounded-full transition-colors cursor-pointer",
                isMenuOpen
                  ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400"
                  : "text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100",
              )}
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div
                ref={menuRef}
                className={clsx(
                  "absolute top-0 z-[9999] w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200",
                  hasFewDates
                    ? "right-full mr-2 origin-top-right"
                    : "left-full ml-2 origin-top-left"
                )}
              >
                <div className="flex flex-col py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      editStudent(student);
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 w-full text-left transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteStudent(student.id);
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 w-full text-left transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </td>

        {monthColumns.map((group) =>
          group.pairs.map((pair, idx) => {
            const date1 = pair[0];
            const date2 = pair[1];
            const date1Key = format(date1, "yyyy-MM-dd");
            const date2Key = date2 ? format(date2, "yyyy-MM-dd") : null;

            const isAbs1 = attendance[date1Key]?.[student.id];
            const isAbs2 = date2Key && attendance[date2Key]?.[student.id];

            const status1 = dateMetadata[date1Key] || { isBlocked: false };
            const status2 = date2Key ? (dateMetadata[date2Key] || { isBlocked: false }) : { isBlocked: false };

            const title1 = `${format(date1, "EEEE")}${status1.reason ? ` - ${status1.reason}` : isAbs1 ? " - Absent" : " - Present"}`;
            const title2 = date2
              ? `${format(date2, "EEEE")}${status2.reason ? ` - ${status2.reason}` : isAbs2 ? " - Absent" : " - Present"}`
              : "";

            return (
              <td
                key={`${group.name}-${idx}`}
                className="border border-slate-200 dark:border-slate-700 p-0 h-[50px] min-w-[3rem]"
              >
                <div className="flex flex-col h-full">
                  {/* Cell 1 */}
                  <div
                    className={clsx(
                      "flex-1 cursor-pointer transition-colors border-b border-slate-200 dark:border-slate-700 relative",
                      status1.isBlocked
                        ? "bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed"
                        : isAbs1
                          ? "bg-red-500 hover:bg-red-600"
                          : "hover:bg-emerald-50 dark:hover:bg-emerald-950/40 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40",
                      status1.isHoliday && "bg-red-100 dark:bg-red-950/60",
                    )}
                    onClick={() =>
                      !status1.isBlocked && toggleAttendance(student.id, date1)
                    }
                    onMouseEnter={() => handleMouseEnter(date1)}
                    onMouseLeave={() => onHover("")}
                    title={title1}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800/40 dark:text-slate-200/40 opacity-0 group-hover:opacity-100 pointer-events-none select-none">
                      {format(date1, "d")}
                    </span>
                  </div>

                  {/* Cell 2 */}
                  {date2 ? (
                    <div
                      className={clsx(
                        "flex-1 cursor-pointer transition-colors relative",
                        status2.isBlocked
                          ? "bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed"
                          : isAbs2
                            ? "bg-red-500 hover:bg-red-600"
                            : "hover:bg-emerald-50 dark:hover:bg-emerald-950/40 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/40",
                        status2.isHoliday && "bg-red-100 dark:bg-red-950/60",
                      )}
                      onClick={() =>
                        !status2.isBlocked &&
                        toggleAttendance(student.id, date2)
                      }
                      onMouseEnter={() => handleMouseEnter(date2)}
                      onMouseLeave={() => onHover("")}
                      title={title2}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-800/40 dark:text-slate-200/40 opacity-0 group-hover:opacity-100 pointer-events-none select-none">
                        {format(date2, "d")}
                      </span>
                    </div>
                  ) : (
                    <div className="flex-1 bg-slate-50 dark:bg-slate-850"></div>
                  )}
                </div>
              </td>
            );
          }),
        )}

        {/* ... Stats column ... */}
        <td className="sticky right-0 z-10 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-center font-bold text-xs group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
          <div className="flex flex-col h-full w-full">
            <div className="flex-1 w-full flex items-center justify-center border-b border-slate-300 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-950/40 group-hover:bg-emerald-100/50 dark:group-hover:bg-emerald-900/40">
              <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                {studentStats.totalPresent}
              </span>
            </div>
            <div className="flex-1 w-full flex items-center justify-center bg-red-50/50 dark:bg-red-950/40 group-hover:bg-red-100/50 dark:group-hover:bg-red-900/40">
              <span className="text-red-600 dark:text-red-400 font-bold text-xs">
                {studentStats.totalAbsences}
              </span>
            </div>
          </div>
        </td>
      </tr>
    );
  },
  (prev, next) => {
    if (prev.student.id !== next.student.id) return false;
    if (prev.student.name !== next.student.name) return false;
    if (prev.sectionId !== next.sectionId) return false;
    if (prev.totalSchoolDays !== next.totalSchoolDays) return false;
    if (prev.dateMetadata !== next.dateMetadata) return false;
    if (prev.monthColumns !== next.monthColumns) return false;
    
    const prevStats = prev.stats.find((s) => s.studentId === prev.student.id);
    const nextStats = next.stats.find((s) => s.studentId === next.student.id);
    if (prevStats?.totalPresent !== nextStats?.totalPresent) return false;
    if (prevStats?.totalAbsences !== nextStats?.totalAbsences) return false;

    return true;
  }
);
