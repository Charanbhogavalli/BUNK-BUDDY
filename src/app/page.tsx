"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mascot } from "@/components/Mascot";
import { DialogueBubble } from "@/components/DialogueBubble";
import { dbService, Dialogue } from "@/lib/db";
import { Calendar, Trash2, ShieldAlert, Award } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [welcomeDialogue, setWelcomeDialogue] = useState<Dialogue | null>(null);

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    const user = dbService.getCurrentUser();
    if (user) {
      router.push("/dashboard");
    }

    // Set a funny intro dialogue
    setWelcomeDialogue({
      dialogueId: "landing_welcome",
      category: "ROAST",
      text: "Oh, look who it is. Another student looking for excuses to bunk class. Dynamic character development.",
      rarity: "common",
      active: true,
      createdAt: new Date().toISOString(),
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-bunk-yellow flex flex-col justify-between max-w-md mx-auto neo-border shadow-2xl p-6 relative">
      {/* Top Header */}
      <div className="flex justify-between items-center mt-2">
        <span className="font-headline font-black text-3xl tracking-widest text-black">
          BUNKBUDDY
        </span>
        <span className="bg-bunk-pink text-white text-xs px-2 py-1 font-black uppercase neo-border-sm neo-shadow-sm select-none">
          Beta
        </span>
      </div>

      {/* Hero Section */}
      <div className="my-6 flex flex-col items-center">
        {/* Title Bubble */}
        <div className="bg-black text-white neo-border p-5 rounded-3xl neo-shadow mb-6 text-center w-full">
          <h1 className="font-headline font-black text-4xl leading-none uppercase tracking-tight text-white">
            Can I bunk <br />
            <span className="text-bunk-pink">tomorrow?</span>
          </h1>
          <p className="font-sans font-bold text-sm text-neutral-300 mt-2 italic">
            &ldquo;The attendance app that judges your life choices.&rdquo;
          </p>
        </div>

        {/* Mascot & Speech Bubble */}
        <div className="w-full flex flex-col items-center gap-4 mb-6 relative">
          <DialogueBubble dialogue={welcomeDialogue} className="w-full" />
          <Mascot status="SAFE" size={140} className="mt-2" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 w-full">
        <Link
          href="/register"
          className="neo-btn bg-bunk-pink text-white font-headline font-extrabold text-xl py-4 rounded-xl text-center w-full uppercase tracking-wider block"
        >
          Start Tracking
        </Link>
        <Link
          href="/login"
          className="neo-btn bg-white text-black font-headline font-extrabold text-xl py-4 rounded-xl text-center w-full uppercase tracking-wider block"
        >
          Login
        </Link>
      </div>

      {/* Feature Showcase Grid */}
      <div className="my-8 flex flex-col gap-4">
        <h3 className="font-headline font-black text-xl uppercase tracking-wide border-b-2 border-black pb-1">
          App Features
        </h3>

        {/* Feature 1 */}
        <div className="bg-black text-white p-4 rounded-xl neo-border flex gap-3 items-center">
          <div className="bg-bunk-pink p-2 neo-border-sm text-black">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-headline font-bold text-sm text-white uppercase">Tap-to-Edit History</h4>
            <p className="text-xs text-neutral-400 font-medium">Forgot to track yesterday? Go back and change it instantly.</p>
          </div>
        </div>

        {/* Feature 2 */}
        <div className="bg-black text-white p-4 rounded-xl neo-border flex gap-3 items-center">
          <div className="bg-bunk-yellow p-2 neo-border-sm text-black">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-headline font-bold text-sm text-white uppercase">Safe Bunks Remaining</h4>
            <p className="text-xs text-neutral-400 font-medium">Know exactly how many lectures you can ditch without debarment.</p>
          </div>
        </div>

        {/* Feature 3 */}
        <div className="bg-black text-white p-4 rounded-xl neo-border flex gap-3 items-center">
          <div className="bg-bunk-green p-2 neo-border-sm text-black">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-headline font-bold text-sm text-white uppercase">Sarcastic Dialogue</h4>
            <p className="text-xs text-neutral-400 font-medium">Get roasted or congratulated based on your academic choices.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-2 text-xs font-bold text-neutral-700 select-none border-t border-black border-dashed mt-4">
        BunkBuddy © 2026. Academic downfall simulator.
      </footer>
    </div>
  );
}
