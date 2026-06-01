"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, BookOpen, User, LogOut } from "lucide-react";
import { dbService, User as UserType } from "@/lib/db";
import { Mascot } from "./Mascot";
import { DialogueBubble } from "./DialogueBubble";
import { useMascot } from "./MascotContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { status, dialogue, setDialogue } = useMascot();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth session
    const currentUser = dbService.getCurrentUser();
    if (!currentUser) {
      router.push("/");
    } else {
      setUser(currentUser);
      // Hydrate mascot speech bubble if currently empty
      if (!dialogue) {
        dbService.getRandomDialogue("ROAST").then((d) => {
          setDialogue(d);
        });
      }
    }
    setLoading(false);
  }, [router, pathname, dialogue, setDialogue]);

  const handleLogout = () => {
    dbService.logout();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bunk-yellow flex items-center justify-center">
        <div className="font-headline font-black text-2xl animate-pulse">
          LOADING BUNKBUDDY...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bunk-yellow text-black font-sans flex justify-center w-full">
      {/* Responsive Grid Container */}
      <div className="w-full max-w-[1280px] grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-5 px-0 md:px-6 lg:px-8 py-0 md:py-6">
        
        {/* 1. LEFT SIDEBAR (Tablet & Desktop only) */}
        <aside className="hidden md:flex md:col-span-3 lg:col-span-3 flex-col gap-4 sticky top-6 h-[calc(100vh-3rem)]">
          {/* Logo Card */}
          <div className="bg-black text-white neo-border p-5 rounded-2xl neo-shadow flex flex-col gap-1">
            <span className="font-headline font-black text-2xl tracking-widest text-bunk-yellow">
              BUNKBUDDY
            </span>
            <span className="text-[10px] text-bunk-pink font-extrabold uppercase tracking-wide">
              STUDENT SURVIVAL v1.0
            </span>
          </div>

          {/* User Info Card */}
          <div className="bg-black text-white p-4 rounded-2xl neo-border neo-shadow flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">
              LOGGED IN SURVIVOR
            </span>
            <span className="font-headline font-black text-lg text-bunk-pink uppercase truncate">
              {user.name}
            </span>
            <span className="text-xs font-bold text-neutral-300">
              Sem {user.semester} • Target {user.requiredAttendance}%
            </span>
          </div>

          {/* Vertical Navigation Links */}
          <div className="bg-black text-white p-4 rounded-2xl neo-border neo-shadow flex-1 flex flex-col justify-between">
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className={`flex items-center gap-3 px-4 py-3 font-headline font-bold text-sm uppercase tracking-wide rounded-xl transition-all ${
                  pathname === "/dashboard"
                    ? "bg-bunk-yellow text-black neo-border-sm neo-shadow-sm font-black"
                    : "hover:bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                <Home className="w-4.5 h-4.5" />
                <span>Home Dashboard</span>
              </Link>

              <Link
                href="/subjects"
                className={`flex items-center gap-3 px-4 py-3 font-headline font-bold text-sm uppercase tracking-wide rounded-xl transition-all ${
                  pathname === "/subjects" || pathname?.startsWith("/subjects/")
                    ? "bg-bunk-yellow text-black neo-border-sm neo-shadow-sm font-black"
                    : "hover:bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-4.5 h-4.5" />
                <span>My Subjects</span>
              </Link>

              <Link
                href="/profile"
                className={`flex items-center gap-3 px-4 py-3 font-headline font-bold text-sm uppercase tracking-wide rounded-xl transition-all ${
                  pathname === "/profile"
                    ? "bg-bunk-yellow text-black neo-border-sm neo-shadow-sm font-black"
                    : "hover:bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                <User className="w-4.5 h-4.5" />
                <span>My Profile</span>
              </Link>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 font-headline font-bold text-sm uppercase tracking-wide rounded-xl bg-neutral-950 text-neutral-400 hover:text-bunk-danger hover:bg-neutral-900 transition-all border border-neutral-900"
            >
              <LogOut className="w-4.5 h-4.5" />
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        {/* 2. CENTER PANEL (Main view - Mobile scroll container, or Desktop middle column) */}
        <main className="col-span-1 md:col-span-9 lg:col-span-9 xl:col-span-6 flex flex-col min-h-screen md:min-h-0 bg-bunk-yellow md:neo-border md:rounded-3xl md:neo-shadow overflow-hidden relative pb-20 md:pb-6">
          {/* Mobile Header (Hidden on tablet/desktop) */}
          <header className="md:hidden bg-bunk-card text-white px-6 py-4 flex justify-between items-center border-b-[3px] border-black">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="font-headline font-black text-2xl tracking-wider text-bunk-yellow">
                BUNKBUDDY
              </span>
              <span className="bg-bunk-pink text-black text-[10px] px-1.5 py-0.5 font-black uppercase neo-border-sm neo-shadow-sm select-none">
                v1.0
              </span>
            </Link>
          </header>

          {/* Viewport for child screens */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto">{children}</div>

          {/* Mobile Bottom Navigation Bar (Hidden on tablet/desktop) */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-bunk-card border-t-[3px] border-black h-20 flex justify-around items-center z-50 px-4">
            <Link
              href="/dashboard"
              className={`flex flex-col items-center justify-center w-16 h-12 transition-all ${
                pathname === "/dashboard"
                  ? "bg-bunk-yellow text-black neo-border-sm neo-shadow-sm scale-110 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-0.5">Home</span>
            </Link>

            <Link
              href="/subjects"
              className={`flex flex-col items-center justify-center w-16 h-12 transition-all ${
                pathname === "/subjects" || pathname?.startsWith("/subjects/")
                  ? "bg-bunk-yellow text-black neo-border-sm neo-shadow-sm scale-110 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-0.5">Subjects</span>
            </Link>

            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center w-16 h-12 transition-all ${
                pathname === "/profile"
                  ? "bg-bunk-yellow text-black neo-border-sm neo-shadow-sm scale-110 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-0.5">Profile</span>
            </Link>
          </nav>
        </main>

        {/* 3. RIGHT MASCOT PANEL (Desktop Only - 1200px+ / xl:col-span-3) */}
        <aside className="hidden xl:flex xl:col-span-3 flex-col gap-4 sticky top-6 h-[calc(100vh-3rem)] justify-start">
          {/* Mascot card */}
          <div className="bg-black text-white p-5 rounded-2xl neo-border neo-shadow flex flex-col items-center gap-6 text-center w-full min-h-[400px] justify-center">
            {/* Dialogue Bubble above Mascot */}
            <DialogueBubble dialogue={dialogue} className="w-full" />
            
            {/* Mascot */}
            <div className="flex flex-col items-center gap-3">
              <Mascot status={status} size={150} />
              <div className="mt-2">
                <span className="font-headline font-black text-base text-bunk-yellow uppercase tracking-widest block">
                  BUNKBUDDY
                </span>
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                  YOUR SURVIVAL MENTOR
                </span>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};
