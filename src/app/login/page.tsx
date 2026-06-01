"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mascot } from "@/components/Mascot";
import { DialogueBubble } from "@/components/DialogueBubble";
import { dbService, hashPassword, Dialogue } from "@/lib/db";

export default function LoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);

  useEffect(() => {
    // Check if already logged in
    if (dbService.getCurrentUser()) {
      router.push("/dashboard");
    }

    setDialogue({
      dialogueId: "login_welcome",
      category: "ROAST",
      text: "Ugh. Finally. Get in here and face your terrible decisions.",
      rarity: "common",
      active: true,
      createdAt: new Date().toISOString(),
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !password.trim()) {
      setError("Fill in the fields, lazy.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const hashedPass = await hashPassword(password);
      await dbService.login(studentId, hashedPass);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
      
      // Update mascot dialogue to reflect login failure
      setDialogue({
        dialogueId: "login_fail",
        category: "CRITICAL",
        text: "Incorrect! Did you forget your password already? Brain cells left the chat.",
        rarity: "common",
        active: true,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bunk-yellow flex flex-col justify-between max-w-md mx-auto neo-border shadow-2xl p-6">
      {/* Header */}
      <div className="text-center mt-2">
        <Link href="/" className="font-headline font-black text-3xl tracking-widest text-black block hover:scale-105 active:scale-95 transition-all">
          BUNKBUDDY
        </Link>
        <span className="font-sans font-bold text-xs uppercase tracking-wider text-neutral-800">
          STUDENT PORTAL
        </span>
      </div>

      {/* Mascot & Speech bubble */}
      <div className="w-full flex flex-col items-center gap-4 my-4">
        <DialogueBubble dialogue={dialogue} className="w-full" />
        <Mascot status={error ? "CRITICAL" : "WARNING"} size={110} />
      </div>

      {/* Login Box */}
      <div className="bg-black text-white neo-border p-6 rounded-2xl neo-shadow w-full">
        <h2 className="font-headline font-black text-2xl uppercase text-bunk-pink mb-4 text-center tracking-wide">
          GET IN HERE.
        </h2>

        {error && (
          <div className="bg-bunk-danger text-black neo-border-sm px-3 py-2 font-bold text-xs mb-4 text-center uppercase tracking-wide">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Student ID */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-widest mb-1.5">
              STUDENT ID
            </label>
            <input
              type="text"
              placeholder="Enter your boring ID here"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={loading}
              className="w-full bg-white text-black font-sans font-semibold p-3 neo-input text-sm rounded-lg"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-widest mb-1.5">
              PASSWORD
            </label>
            <input
              type="password"
              placeholder="The secret word..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-white text-black font-sans font-semibold p-3 neo-input text-sm rounded-lg"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full neo-btn bg-bunk-pink text-white font-headline font-black text-lg py-3.5 uppercase tracking-widest rounded-xl mt-2 block disabled:opacity-50"
          >
            {loading ? "AUTHENTICATING..." : "LOGIN"}
          </button>
        </form>

        <div className="text-center mt-5 text-sm font-bold">
          <span className="text-neutral-400">First time? </span>
          <Link href="/register" className="text-bunk-yellow underline hover:text-white transition-colors">
            Create Account
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs font-bold text-neutral-700 mt-4 select-none">
        Forgot password? Just make a new account. We don&apos;t care.
      </div>
    </div>
  );
}
