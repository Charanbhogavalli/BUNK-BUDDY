"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";
import {
  dbService,
  Subject,
  AttendanceHistory,
  User,
  calculateAttendancePercentage,
  calculateSafeBunks,
  calculateRecoveryClasses,
  getSubjectRiskLevel,
} from "@/lib/db";
import { useMascot } from "@/components/MascotContext";
import { ArrowLeft, Calendar as CalIcon, Calculator, ChevronLeft, ChevronRight, X, Trash2, CalendarCheck } from "lucide-react";
import Link from "next/link";

export default function SubjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;
  const { setStatus, setDialogue, triggerRefresh, refreshData } = useMascot();

  const [user, setUser] = useState<User | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [history, setHistory] = useState<AttendanceHistory[]>([]);
  
  // Calendar state
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // 0-indexed, 5 = June
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDayStatus, setSelectedDayStatus] = useState<"PRESENT" | "ABSENT" | "NONE">("NONE");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async (studentId: string) => {
    try {
      // Parallelized queries targeting the single subject document directly
      const [found, hist] = await Promise.all([
        dbService.getSubject(subjectId),
        dbService.getAttendanceHistory(studentId, subjectId)
      ]);

      setSubject(found);
      setHistory(hist);

      // Sync Mascot State based on subject risk
      const pct = calculateAttendancePercentage(found.attendedClasses, found.totalClasses);
      const risk = getSubjectRiskLevel(pct);
      
      let mascotStatus: "SAFE" | "WARNING" | "CRITICAL" = "SAFE";
      let text = `Subject: ${found.subjectName} is in ${risk} status.`;
      
      if (risk === "Cooked" || risk === "Danger") {
        mascotStatus = "CRITICAL";
        text = `You're absolutely cooked in ${found.subjectName}! Stop bunking and attend class!`;
      } else if (risk === "Careful") {
        mascotStatus = "WARNING";
        text = `Careful... You are on the edge in ${found.subjectName}. One more bunk and you're cooked.`;
      } else {
        mascotStatus = "SAFE";
        text = `Looking solid in ${found.subjectName}. You have safe bunks left. Relax.`;
      }

      setStatus(mascotStatus);
      setDialogue({
        dialogueId: "subj_detail_sync",
        category: mascotStatus === "SAFE" ? "SAFE" : mascotStatus === "WARNING" ? "WARNING" : "CRITICAL",
        text,
        rarity: "common",
        active: true,
        createdAt: new Date().toISOString(),
      });

    } catch (e) {
      console.error(e);
      setError("Failed to load subject details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentUser = dbService.getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    setUser(currentUser);
    loadData(currentUser.studentId);
  }, [subjectId, router, triggerRefresh]);

  const handleDeleteSubject = async () => {
    if (!user || !subject) return;
    if (confirm(`Are you sure you want to delete ${subject.subjectName}? This wipes all history!`)) {
      try {
        await dbService.deleteSubject(user.studentId, subject.subjectId);
        refreshData();
        router.push("/subjects");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleTimelineDelete = async (dateStr: string) => {
    if (!user || !subject) return;
    if (confirm(`Remove attendance log for date: ${dateStr}?`)) {
      try {
        const updatedSubj = await dbService.updateHistoryRecord(
          user.studentId,
          subject.subjectId,
          dateStr,
          null
        );
        setSubject(updatedSubj);
        refreshData(); // Refresh overall state
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getHistoryStatusForDay = useCallback((day: number) => {
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    const match = history.find((h) => h.date === dateStr);
    return match ? match.status : null;
  }, [currentYear, currentMonth, history]);

  const handleDayClick = useCallback((day: number) => {
    const monthStr = String(currentMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    setSelectedDate(dateStr);
    const existingStatus = getHistoryStatusForDay(day);
    setSelectedDayStatus(existingStatus || "NONE");
    setIsEditModalOpen(true);
  }, [currentYear, currentMonth, getHistoryStatusForDay]);

  const handleSaveAttendanceEdit = async () => {
    if (!user || !subject || !selectedDate) return;

    try {
      const statusArg = selectedDayStatus === "NONE" ? null : selectedDayStatus;
      const updatedSubj = await dbService.updateHistoryRecord(
        user.studentId,
        subject.subjectId,
        selectedDate,
        statusArg
      );

      setSubject(updatedSubj);
      setIsEditModalOpen(false);
      
      // Update mascot dialogues
      const pct = calculateAttendancePercentage(updatedSubj.attendedClasses, updatedSubj.totalClasses);
      const category = pct >= user.requiredAttendance ? "PRESENT" : "ABSENT";
      const dialog = await dbService.getRandomDialogue(category);
      setDialogue(dialog);

      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center font-headline font-black text-xl py-20">
          LOADING DETAILS...
        </div>
      </AppLayout>
    );
  }

  if (error || !subject || !user) {
    return (
      <AppLayout>
        <div className="bg-bunk-danger text-black neo-border p-6 rounded-2xl neo-shadow text-center">
          <p className="font-headline font-black text-lg">⚠️ ERROR</p>
          <p className="text-sm font-bold mt-2">{error || "Something failed."}</p>
          <Link href="/subjects" className="neo-btn bg-white text-black text-xs font-bold px-4 py-2 mt-4 inline-block rounded-lg">
            Back to Subjects
          </Link>
        </div>
      </AppLayout>
    );
  }

  const { pct, missed, safeCount, recoveryCount, risk } = useMemo(() => {
    const p = calculateAttendancePercentage(subject.attendedClasses, subject.totalClasses);
    const m = subject.totalClasses - subject.attendedClasses;
    const s = calculateSafeBunks(subject.attendedClasses, subject.totalClasses, user.requiredAttendance);
    const r = calculateRecoveryClasses(subject.attendedClasses, subject.totalClasses, user.requiredAttendance);
    const k = getSubjectRiskLevel(p);
    return { pct: p, missed: m, safeCount: s, recoveryCount: r, risk: k };
  }, [subject, user.requiredAttendance]);

  // Generate Calendar Grid
  const calendarCells = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    
    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-10 bg-neutral-900 border border-neutral-800 rounded"></div>);
    }

    // High performance O(1) map lookup for the month's days instead of array.find inside loop
    const historyMap = new Map<string, string>();
    history.forEach((h) => {
      historyMap.set(h.date, h.status);
    });

    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(currentMonth + 1).padStart(2, "0");
      const dayStr = String(d).padStart(2, "0");
      const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
      const status = historyMap.get(dateStr);
      
      let cellStyle = "h-10 flex items-center justify-center font-bold text-xs neo-border-sm cursor-pointer rounded transition-all active:scale-90 ";
      if (status === "PRESENT") {
        cellStyle += "bg-bunk-green text-white";
      } else if (status === "ABSENT") {
        cellStyle += "bg-bunk-danger text-white";
      } else {
        cellStyle += "bg-neutral-800 text-neutral-400 border-dashed hover:bg-neutral-700";
      }

      cells.push(
        <button
          key={`day-${d}`}
          type="button"
          onClick={() => handleDayClick(d)}
          className={cellStyle}
        >
          {d}
        </button>
      );
    }
    return cells;
  }, [currentYear, currentMonth, history, handleDayClick]);

  // Attendance Timeline sorted descending (most recent logs first)
  const timelineLogs = [...history].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 relative">
        {/* Navigation & Header */}
        <div className="flex justify-between items-center border-b-2 border-black pb-2">
          <Link href="/subjects" className="neo-btn bg-white text-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <button
            type="button"
            onClick={handleDeleteSubject}
            className="neo-btn bg-bunk-danger text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold"
          >
            <Trash2 className="w-4 h-4" /> Delete Course
          </button>
        </div>

        {/* Subject Profile Header */}
        <div className="bg-black text-white p-5 rounded-2xl neo-border neo-shadow flex justify-between items-center">
          <div>
            <span className={`text-[9px] font-black px-2 py-0.5 uppercase neo-border-sm mb-2 inline-block ${
              risk === "Academic Weapon" || risk === "Safe" ? "bg-bunk-green text-black" :
              risk === "Careful" ? "bg-bunk-warning text-black" : "bg-bunk-danger text-white"
            }`}>
              {risk}
            </span>
            <h1 className="font-headline font-black text-2xl uppercase tracking-wider text-bunk-yellow leading-tight">
              {subject.subjectName}
            </h1>
            <p className="text-xs font-bold text-neutral-400 mt-1 uppercase tracking-wide">
              Attended: {subject.attendedClasses} / {subject.totalClasses} lectures
            </p>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="font-headline font-black text-3xl bg-bunk-pink text-white px-3 py-2 neo-border">
              {pct}%
            </span>
            <span className="text-[9px] font-extrabold text-neutral-500 mt-1 uppercase">
              Target: {user.requiredAttendance}%
            </span>
          </div>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 neo-border rounded-2xl neo-shadow flex flex-col justify-between">
            <div>
              <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                SAFE BUNKS REMAINING
              </span>
              <span className={`font-headline font-black text-3xl mt-1 block ${safeCount > 0 ? "text-bunk-green" : "text-bunk-danger"}`}>
                {safeCount}
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 mt-2 leading-tight">
              {safeCount > 0
                ? "You can ditch this many lectures safely."
                : "You cannot afford to bunk a single lecture!"}
            </p>
          </div>

          <div className="bg-white p-4 neo-border rounded-2xl neo-shadow flex flex-col justify-between">
            <div>
              <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                MISSED LECTURES
              </span>
              <span className="font-headline font-black text-3xl mt-1 block text-neutral-800">
                {missed}
              </span>
            </div>
            <p className="text-[10px] font-bold text-neutral-600 mt-2 leading-tight">
              Lectures you missed or escaped from.
            </p>
          </div>
        </div>

        {/* RECOVERY CALCULATOR CARD */}
        <div className="bg-black text-white p-5 rounded-2xl neo-border neo-shadow flex gap-4 items-center">
          <div className="bg-bunk-pink text-black p-3 neo-border-sm rounded-xl">
            <Calculator className="w-6 h-6 stroke-[2.5px]" />
          </div>
          <div className="flex-1">
            <h3 className="font-headline font-black text-sm uppercase text-bunk-pink">
              RECOVERY CALCULATOR
            </h3>
            {pct >= user.requiredAttendance ? (
              <p className="text-xs text-bunk-green font-extrabold mt-1">
                YOU&apos;RE SAFE! No recovery needed. You are maintaining target attendance.
              </p>
            ) : (
              <p className="text-xs text-neutral-300 font-semibold mt-1">
                Attend the next{" "}
                <span className="text-bunk-yellow font-black text-sm underline px-0.5">
                  {recoveryCount}
                </span>{" "}
                lectures in a row to recover to {user.requiredAttendance}%.
              </p>
            )}
          </div>
        </div>

        {/* ATTENDANCE HISTORY CALENDAR */}
        <div className="bg-black text-white p-5 rounded-2xl neo-border neo-shadow flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
            <h3 className="font-headline font-black text-sm uppercase text-bunk-yellow flex items-center gap-2">
              <CalIcon className="w-4 h-4 text-bunk-pink" /> HISTORY CALENDAR
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-neutral-800 rounded transition-colors text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold select-none min-w-24 text-center">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-neutral-800 rounded transition-colors text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-[10px] font-bold text-neutral-400 italic">
            Tap a date cell to log attendance retroactively (✓ = Present, ✗ = Absent).
          </p>

          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-neutral-400 uppercase tracking-widest mt-1">
            <div>Su</div>
            <div>Mo</div>
            <div>Tu</div>
            <div>We</div>
            <div>Th</div>
            <div>Fr</div>
            <div>Sa</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">{calendarCells}</div>
        </div>

        {/* ATTENDANCE TIMELINE */}
        <div className="bg-black text-white p-5 rounded-2xl neo-border neo-shadow flex flex-col gap-3">
          <h3 className="font-headline font-black text-sm uppercase text-bunk-yellow flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-bunk-pink" /> ATTENDANCE TIMELINE
          </h3>
          
          {timelineLogs.length === 0 ? (
            <p className="text-xs text-neutral-500 font-bold italic py-4 text-center">
              No dates logged. Mark dates in the calendar above.
            </p>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {timelineLogs.map((log) => (
                <div key={log.attendanceId} className="bg-neutral-900 border border-neutral-800 px-4 py-2.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 flex items-center justify-center font-extrabold text-xs neo-border-sm rounded-full ${
                      log.status === "PRESENT" ? "bg-bunk-green text-white" : "bg-bunk-danger text-white"
                    }`}>
                      {log.status === "PRESENT" ? "✓" : "✗"}
                    </span>
                    <span className="text-xs font-bold text-neutral-200">
                      {log.date}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTimelineDelete(log.date)}
                    className="text-neutral-500 hover:text-bunk-danger transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Date Modal */}
        {isEditModalOpen && selectedDate && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 rounded-3xl">
            <div className="bg-black text-white neo-border p-6 rounded-2xl w-full neo-shadow-lg max-w-xs relative">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="font-headline font-black text-lg text-bunk-yellow uppercase mb-2">
                EDIT ATTENDANCE
              </h3>
              <p className="text-xs font-bold text-neutral-400 mb-4">
                Date: {selectedDate}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDayStatus("PRESENT")}
                  className={`w-full font-headline font-black py-2.5 rounded-xl text-center text-xs neo-border-sm ${
                    selectedDayStatus === "PRESENT"
                      ? "bg-bunk-green text-white neo-shadow-sm scale-102"
                      : "bg-white text-black hover:bg-neutral-200"
                  }`}
                >
                  ✓ MARK PRESENT (SHOWED UP)
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDayStatus("ABSENT")}
                  className={`w-full font-headline font-black py-2.5 rounded-xl text-center text-xs neo-border-sm ${
                    selectedDayStatus === "ABSENT"
                      ? "bg-bunk-danger text-white neo-shadow-sm scale-102"
                      : "bg-white text-black hover:bg-neutral-200"
                  }`}
                >
                  ✗ MARK ABSENT (ESCAPED)
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDayStatus("NONE")}
                  className={`w-full font-headline font-black py-2.5 rounded-xl text-center text-xs neo-border-sm ${
                    selectedDayStatus === "NONE"
                      ? "bg-neutral-700 text-white neo-shadow-sm"
                      : "bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                >
                  CLEAR DATE HISTORY
                </button>

                <button
                  type="button"
                  onClick={handleSaveAttendanceEdit}
                  className="w-full neo-btn bg-bunk-pink text-white font-headline font-black py-3 uppercase tracking-wider text-sm rounded-xl mt-3"
                >
                  SAVE RECORD
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
