"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Mascot } from "@/components/Mascot";
import { DialogueBubble } from "@/components/DialogueBubble";
import {
  dbService,
  Subject,
  Dialogue,
  User,
  AttendanceHistory,
  calculateAttendancePercentage,
  calculateSafeBunks,
  getSubjectRiskLevel,
} from "@/lib/db";
import { useMascot } from "@/components/MascotContext";
import { ThumbsUp, ShieldAlert, Award, Calendar, ChevronRight, Activity, Frown } from "lucide-react";
import Link from "next/link";
import { useMemo, useCallback } from "react";

export default function Dashboard() {
  const { setStatus, setDialogue, dialogue: mascotDialogue, triggerRefresh, refreshData } = useMascot();
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [criticalSubjects, setCriticalSubjects] = useState<Subject[]>([]);
  const [recentActivity, setRecentActivity] = useState<(AttendanceHistory & { subjectName: string })[]>([]);
  const [todayAttendanceMap, setTodayAttendanceMap] = useState<Record<string, AttendanceHistory>>({});

  const [overallStatus, setOverallStatusState] = useState<"SAFE" | "WARNING" | "CRITICAL">("SAFE");
  const [overallStatusText, setOverallStatusText] = useState("");
  const [totalSafeBunks, setTotalSafeBunks] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  const loadDashboardData = async (studentId: string) => {
    try {
      setLoadingData(true);
      const dateStr = new Date().toISOString().split("T")[0];

      // Parallelized batched queries
      const [subjs, activity, todayLogs] = await Promise.all([
        dbService.getSubjects(studentId),
        dbService.getRecentActivity(studentId, 5),
        dbService.getTodayAttendanceLogs(studentId, dateStr),
      ]);

      setSubjects(subjs);
      setRecentActivity(activity);
      setTodayAttendanceMap(todayLogs);

      const reqPct = dbService.getCurrentUser()?.requiredAttendance || 75;

      let hasCritical = false;
      let hasWarning = false;
      let totalBunks = 0;
      const critList: Subject[] = [];

      subjs.forEach((s) => {
        const pct = calculateAttendancePercentage(s.attendedClasses, s.totalClasses);
        const bunks = calculateSafeBunks(s.attendedClasses, s.totalClasses, reqPct);
        totalBunks += bunks;

        if (pct < reqPct) {
          hasCritical = true;
          critList.push(s);
        } else if (bunks === 0) {
          hasWarning = true;
        }
      });

      setCriticalSubjects(critList);
      setTotalSafeBunks(totalBunks);

      // Determine Overall Status
      let currentStatus: "SAFE" | "WARNING" | "CRITICAL" = "SAFE";
      if (hasCritical) {
        currentStatus = "CRITICAL";
        setOverallStatusText("NO. You are cooked in at least one subject.");
      } else if (hasWarning) {
        currentStatus = "WARNING";
        setOverallStatusText("DANGEROUS. You have zero safe bunks left in a course.");
      } else {
        currentStatus = "SAFE";
        setOverallStatusText(`YES. You have ${totalBunks} safe bunks left across subjects.`);
      }

      setOverallStatusState(currentStatus);
      setStatus(currentStatus); // Sync with persistent desktop Mascot panel
    } catch (e) {
      console.error("Dashboard error:", e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    const currentUser = dbService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      loadDashboardData(currentUser.studentId);
    }
  }, [triggerRefresh]);

  const handleLogAttendance = useCallback(async (subjectId: string, status: "PRESENT" | "ABSENT") => {
    if (!user) return;
    try {
      const { subject, dialog } = await dbService.logAttendanceDirect(
        user.studentId,
        subjectId,
        status
      );

      // Show fresh dialogue bubble on Mascot panel
      setDialogue(dialog);
      
      // Trigger context refresh
      refreshData();
    } catch (e: any) {
      alert(e.message || "Failed to log attendance.");
    }
  }, [user, setDialogue, refreshData]);

  const getHeroStyles = () => {
    switch (overallStatus) {
      case "CRITICAL":
        return { bg: "bg-bunk-danger", text: "text-black", badge: "💀 CRITICAL ZONE" };
      case "WARNING":
        return { bg: "bg-bunk-warning", text: "text-black", badge: "😬 WARNING ZONE" };
      default:
        return { bg: "bg-bunk-green", text: "text-white", badge: "😎 SAFE ZONE" };
    }
  };

  const heroStyles = getHeroStyles();

  const overallPct = useMemo(() => {
    if (subjects.length === 0) return 100;
    const totalAttended = subjects.reduce((acc, s) => acc + s.attendedClasses, 0);
    const totalClasses = subjects.reduce((acc, s) => acc + s.totalClasses, 0);
    return calculateAttendancePercentage(totalAttended, totalClasses);
  }, [subjects]);

  if (loadingData && subjects.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6 animate-pulse select-none">
          {/* Skeleton Hero Status Card */}
          <div className="h-56 bg-black rounded-3xl border-3 border-black flex flex-col items-center justify-center p-6 gap-4">
            <div className="h-6 w-32 bg-neutral-800 rounded-lg"></div>
            <div className="h-12 w-48 bg-neutral-800 rounded-lg"></div>
            <div className="h-4 w-64 bg-neutral-800 rounded-lg"></div>
            <div className="w-full border-t border-neutral-800 border-dashed my-2"></div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="h-12 bg-neutral-800 rounded-xl"></div>
              <div className="h-12 bg-neutral-800 rounded-xl"></div>
            </div>
          </div>
          {/* Skeleton Subjects */}
          <div className="h-48 bg-black rounded-2xl border-3 border-black p-5 flex flex-col gap-4">
            <div className="h-6 w-44 bg-neutral-800 rounded-lg"></div>
            <div className="h-14 bg-neutral-800 rounded-xl"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Mascot & Speech Bubble (Visible on mobile, hidden on desktop layout sidebar) */}
        <div className="xl:hidden w-full flex flex-col items-center gap-4 relative">
          <DialogueBubble dialogue={mascotDialogue} className="w-full" />
          <Mascot status={overallStatus} size={110} />
        </div>

        {/* Large Hero Status Card */}
        <div className={`neo-border rounded-3xl p-6 text-black neo-shadow ${heroStyles.bg} flex flex-col items-center text-center`}>
          <span className="bg-black text-white font-headline font-black text-xs px-2.5 py-1 uppercase neo-border-sm mb-3">
            {heroStyles.badge}
          </span>
          <h2 className="font-headline font-black text-2xl uppercase tracking-wider mb-1">
            CAN I BUNK TOMORROW?
          </h2>
          <h1 className="font-headline font-black text-6xl my-2 tracking-tighter uppercase drop-shadow-[2.5px_2.5px_0px_rgba(0,0,0,1)]">
            {overallStatus === "SAFE" ? "YES" : overallStatus === "WARNING" ? "RISKY" : "NO"}
          </h1>
          <p className="font-sans font-bold text-sm leading-snug px-2 mt-2">
            {overallStatusText}
          </p>
          <div className="w-full border-t border-black border-dashed my-4"></div>
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-white p-3 neo-border-sm rounded-xl">
              <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wide">
                OVERALL ATTENDANCE
              </span>
              <span className="font-headline font-black text-xl text-black">
                {overallPct}%
              </span>
            </div>
            <div className="bg-white p-3 neo-border-sm rounded-xl">
              <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wide">
                SAFE BUNKS LEFT
              </span>
              <span className="font-headline font-black text-xl text-bunk-pink">
                {totalSafeBunks}
              </span>
            </div>
          </div>
        </div>

        {/* CRITICAL SUBJECTS SECTION */}
        {criticalSubjects.length > 0 && (
          <div className="bg-black text-white p-5 rounded-2xl neo-border neo-shadow flex flex-col gap-3">
            <h3 className="font-headline font-black text-sm uppercase text-bunk-danger flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-bunk-danger animate-pulse" />
              CRITICAL CORES ({criticalSubjects.length})
            </h3>
            <div className="flex flex-col gap-2">
              {criticalSubjects.map((s) => {
                const pct = calculateAttendancePercentage(s.attendedClasses, s.totalClasses);
                return (
                  <Link
                    key={s.subjectId}
                    href={`/subjects/${s.subjectId}`}
                    className="bg-neutral-900 border border-bunk-danger p-3 rounded-xl flex justify-between items-center hover:bg-neutral-850 transition-all"
                  >
                    <div>
                      <span className="font-headline font-bold text-sm text-white uppercase">{s.subjectName}</span>
                      <span className="block text-[10px] text-neutral-400 font-medium">
                        Classes: {s.attendedClasses}/{s.totalClasses}
                      </span>
                    </div>
                    <span className="bg-bunk-danger text-white font-headline font-black text-xs px-2.5 py-1 neo-border-sm">
                      {pct}%
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* TODAY'S LECTURES */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center border-b-2 border-black pb-1">
            <h3 className="font-headline font-black text-xl uppercase tracking-wider text-black">
              TODAY'S SUBJECTS
            </h3>
            <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 uppercase neo-border-sm">
              Checklist
            </span>
          </div>

          {subjects.length === 0 ? (
            <div className="bg-black text-white p-6 rounded-2xl neo-border text-center neo-shadow">
              <p className="text-sm font-bold italic text-neutral-400">
                No subjects registered! Go to the "Subjects" tab and click (+) to register courses.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {subjects.map((subj) => {
                const pct = calculateAttendancePercentage(subj.attendedClasses, subj.totalClasses);
                const req = user?.requiredAttendance || 75;
                const safeCount = calculateSafeBunks(subj.attendedClasses, subj.totalClasses, req);
                const riskLevel = getSubjectRiskLevel(pct);
                
                // Duplicate check for today
                const todayRecord = todayAttendanceMap[subj.subjectId];

                return (
                  <div key={subj.subjectId} className="bg-black text-white p-4 rounded-2xl neo-border neo-shadow flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-headline font-black text-lg text-bunk-yellow uppercase">
                          {subj.subjectName}
                        </h4>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-[10px] font-extrabold text-neutral-400 uppercase">
                            Attended: {subj.attendedClasses}/{subj.totalClasses}
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 uppercase neo-border-sm ${
                            riskLevel === "Academic Weapon" ? "bg-bunk-green text-black" :
                            riskLevel === "Safe" ? "bg-bunk-green text-white" :
                            riskLevel === "Careful" ? "bg-bunk-warning text-black" :
                            "bg-bunk-danger text-white"
                          }`}>
                            {riskLevel}
                          </span>
                        </div>
                      </div>
                      
                      <span className="bg-white text-black font-headline font-black text-sm px-2 py-1 neo-border-sm">
                        {pct}%
                      </span>
                    </div>

                    <div className="text-xs font-bold text-neutral-300">
                      {safeCount > 0 ? (
                        <span className="text-bunk-green">Safe bunks left: {safeCount}</span>
                      ) : (
                        <span className="text-bunk-danger">No safe bunks left!</span>
                      )}
                    </div>

                    {/* Attendance logging block or already marked validation warning */}
                    {todayRecord ? (
                      <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl flex items-center justify-between mt-1">
                        <span className="text-xs font-bold text-neutral-400">
                          Already marked today as:{" "}
                          <span className={todayRecord.status === "PRESENT" ? "text-bunk-green font-black" : "text-bunk-danger font-black"}>
                            {todayRecord.status}
                          </span>
                        </span>
                        
                        <Link
                          href={`/subjects/${subj.subjectId}`}
                          className="text-[10px] font-headline font-black bg-bunk-yellow text-black px-2 py-1 neo-border-sm flex items-center gap-1 hover:bg-white transition-all"
                        >
                          EDIT HISTORY <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => handleLogAttendance(subj.subjectId, "PRESENT")}
                          className="neo-btn bg-bunk-green text-white font-headline font-black text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> SHOWED UP
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLogAttendance(subj.subjectId, "ABSENT")}
                          className="neo-btn bg-bunk-danger text-white font-headline font-black text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                        >
                          <Frown className="w-3.5 h-3.5" /> ESCAPED
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RECENT ACTIVITY LOGS */}
        <div className="flex flex-col gap-3">
          <h3 className="font-headline font-black text-sm uppercase text-black tracking-wide border-b border-black pb-0.5 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-bunk-pink" /> RECENT ACTIVITY
          </h3>
          {recentActivity.length === 0 ? (
            <p className="text-xs text-neutral-600 font-bold italic py-2">
              No attendance logs found in history.
            </p>
          ) : (
            <div className="bg-black text-white p-4 rounded-xl neo-border neo-shadow flex flex-col gap-2.5">
              {recentActivity.map((log) => (
                <div key={log.attendanceId} className="flex justify-between items-center text-xs border-b border-neutral-800 pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="font-headline font-bold text-sm text-bunk-yellow uppercase">{log.subjectName}</span>
                    <span className="text-[10px] text-neutral-400 font-medium">Logged: {log.date}</span>
                  </div>
                  
                  <span className={`font-headline font-black text-[10px] px-2 py-0.5 neo-border-sm ${
                    log.status === "PRESENT" ? "bg-bunk-green text-white" : "bg-bunk-danger text-white"
                  }`}>
                    {log.status === "PRESENT" ? "PRESENT" : "ABSENT"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Creator Credit Footer */}
        <footer className="border-t border-black/10 dark:border-white/10 pt-4 mt-2 flex flex-col items-center justify-center gap-1.5 text-center text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400 font-sans tracking-wide">
          <span className="font-bold">Created by Charan Bhogavalli</span>
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/in/charan-bhogavalli-920a65315"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 sm:w-3.5 sm:h-3.5">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect width="4" height="12" x="2" y="9"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
              <span>LinkedIn</span>
            </a>
            <a
              href="https://github.com/Charanbhogavalli"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 sm:w-3.5 sm:h-3.5">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                <path d="M9 18c-4.51 2-5-2-7-2"/>
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
}
