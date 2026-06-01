"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useRouter } from "next/navigation";
import {
  dbService,
  User,
  Subject,
  calculateAttendancePercentage,
  getUserStatusBadge,
} from "@/lib/db";
import { LogOut } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (studentId: string) => {
    try {
      const data = await dbService.getSubjects(studentId);
      setSubjects(data);
    } catch (e) {
      console.error(e);
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
  }, [router]);

  const handleLogout = () => {
    dbService.logout();
    router.push("/");
  };



  if (loading || !user) {
    return (
      <AppLayout>
        <div className="text-center font-headline font-black text-xl py-20">
          LOADING PROFILE...
        </div>
      </AppLayout>
    );
  }

  // Calculate overall metrics
  const totalAttended = subjects.reduce((acc, s) => acc + s.attendedClasses, 0);
  const totalClasses = subjects.reduce((acc, s) => acc + s.totalClasses, 0);
  const overallPct = calculateAttendancePercentage(totalAttended, totalClasses);
  const statusBadge = getUserStatusBadge(overallPct);

  // Styling properties for the status badge card
  const getBadgeCardStyles = () => {
    switch (statusBadge) {
      case "Faculty Favorite":
        return {
          bg: "bg-bunk-green",
          text: "text-white",
          motto: "Professors love you. You probably sit in the front row. Nerd behavior.",
        };
      case "Academic Survivor":
        return {
          bg: "bg-bunk-yellow",
          text: "text-black",
          motto: "Decent average, right on the line. You bunk responsibly.",
        };
      default:
        return {
          bg: "bg-bunk-danger",
          text: "text-white",
          motto: "Classes are just suggestions, right? Prepare your debarment appeals.",
        };
    }
  };

  const badgeStyles = getBadgeCardStyles();

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Title */}
        <div className="border-b-2 border-black pb-2">
          <h1 className="font-headline font-black text-2xl uppercase tracking-wide text-black">
            STUDENT PROFILE
          </h1>
        </div>

        {/* Profile Card */}
        <div className="bg-black text-white p-5 rounded-2xl neo-border neo-shadow flex items-center gap-4">
          <div className="bg-bunk-pink w-16 h-16 neo-border flex items-center justify-center font-headline font-black text-3xl text-black">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-headline font-black text-xl text-bunk-yellow leading-tight uppercase">
              {user.name}
            </h2>
            <p className="text-xs text-neutral-400 font-extrabold mt-1">
              ID: {user.studentId.toUpperCase()} • SEMESTER {user.semester}
            </p>
          </div>
        </div>

        {/* OVERALL ATTENDANCE CARD */}
        <div className={`neo-border rounded-3xl p-5 neo-shadow ${badgeStyles.bg} ${badgeStyles.text}`}>
          <div className="flex justify-between items-center mb-3">
            <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 uppercase neo-border-sm">
              STATUS BADGE
            </span>
            <span className="font-headline font-black text-xs uppercase underline">
              Target: {user.requiredAttendance}%
            </span>
          </div>

          <h3 className="font-headline font-black text-2xl uppercase tracking-wider">
            {statusBadge}
          </h3>
          
          <h1 className="font-headline font-black text-5xl my-2 tracking-tighter uppercase drop-shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)]">
            {overallPct}%
          </h1>

          <p className="font-sans font-bold text-xs mt-2 leading-relaxed opacity-90">
            {badgeStyles.motto}
          </p>
        </div>

        {/* SETTINGS / PREFERENCES MENU */}
        <div className="flex flex-col gap-3">
          <h3 className="font-headline font-black text-sm uppercase text-black tracking-wide border-b border-black pb-0.5">
            Preferences & Debugs
          </h3>





          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left bg-black text-white p-4 rounded-xl neo-border neo-shadow-sm flex items-center justify-between hover:translate-x-0.5 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white text-black p-1.5 neo-border-sm rounded-lg">
                <LogOut className="w-4 h-4 stroke-[2.5px]" />
              </div>
              <span className="text-xs font-headline font-black uppercase text-white">
                Sign Out / Exit App
              </span>
            </div>
            <span className="text-neutral-400 text-xs font-extrabold uppercase">Bye</span>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
