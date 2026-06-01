"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mascot } from "@/components/Mascot";
import { DialogueBubble } from "@/components/DialogueBubble";
import { dbService, hashPassword, Dialogue } from "@/lib/db";

export default function RegisterPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [semester, setSemester] = useState("1");
  const [requiredAttendance, setRequiredAttendance] = useState("75");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);

  useEffect(() => {
    if (dbService.getCurrentUser()) {
      router.push("/dashboard");
    }

    setDialogue({
      dialogueId: "register_welcome",
      category: "ROAST",
      text: "Signing up? Oh, a brand new academic career to ruin. I can't wait.",
      rarity: "common",
      active: true,
      createdAt: new Date().toISOString(),
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !name.trim() || !password.trim()) {
      setError("Provide all details, Einstein.");
      return;
    }

    const reqPct = Number(requiredAttendance);
    if (isNaN(reqPct) || reqPct < 0 || reqPct > 100) {
      setError("Required attendance must be between 0 and 100.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const hashedPass = await hashPassword(password);
      await dbService.register(
        studentId,
        name,
        hashedPass,
        Number(semester),
        reqPct
      );
      // Redirect to first-time setup page!
      router.push("/setup");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
      setDialogue({
        dialogueId: "register_fail",
        category: "CRITICAL",
        text: "Registration crashed. Maybe someone already registered that ID. Try again.",
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
          JOIN THE DOWNFALL
        </span>
      </div>

      {/* Mascot & Speech bubble */}
      <div className="w-full flex flex-col items-center gap-4 my-4">
        <DialogueBubble dialogue={dialogue} className="w-full" />
        <Mascot status={error ? "CRITICAL" : "SAFE"} size={100} />
      </div>

      {/* Register Box */}
      <div className="bg-black text-white neo-border p-6 rounded-2xl neo-shadow w-full">
        <h2 className="font-headline font-black text-2xl uppercase text-bunk-pink mb-4 text-center tracking-wide">
          CREATE ACCOUNT.
        </h2>

        {error && (
          <div className="bg-bunk-danger text-black neo-border-sm px-3 py-2 font-bold text-xs mb-4 text-center uppercase tracking-wide">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Student ID */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-300 uppercase tracking-widest mb-1">
              STUDENT ID
            </label>
            <input
              type="text"
              placeholder="e.g. cs2401"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={loading}
              className="w-full bg-white text-black font-sans font-semibold p-2.5 neo-input text-xs rounded-lg"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-300 uppercase tracking-widest mb-1">
              NAME
            </label>
            <input
              type="text"
              placeholder="Your cool name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full bg-white text-black font-sans font-semibold p-2.5 neo-input text-xs rounded-lg"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-300 uppercase tracking-widest mb-1">
              PASSWORD
            </label>
            <input
              type="password"
              placeholder="Make it strong or not"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-white text-black font-sans font-semibold p-2.5 neo-input text-xs rounded-lg"
            />
          </div>

          {/* Semester & Required Attendance (2-col grid) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase tracking-widest mb-1">
                SEMESTER
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                disabled={loading}
                className="w-full bg-white text-black font-sans font-bold p-2.5 neo-input text-xs rounded-lg cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Sem {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase tracking-widest mb-1">
                TARGET %
              </label>
              <input
                type="number"
                placeholder="75"
                min="0"
                max="100"
                value={requiredAttendance}
                onChange={(e) => setRequiredAttendance(e.target.value)}
                disabled={loading}
                className="w-full bg-white text-black font-sans font-semibold p-2.5 neo-input text-xs rounded-lg"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full neo-btn bg-bunk-pink text-white font-headline font-black text-lg py-3 uppercase tracking-widest rounded-xl mt-3 block disabled:opacity-50"
          >
            {loading ? "CREATING..." : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="text-center mt-4 text-xs font-bold">
          <span className="text-neutral-400">Already a survivor? </span>
          <Link href="/login" className="text-bunk-yellow underline hover:text-white transition-colors">
            Login here
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] font-bold text-neutral-700 mt-2 select-none">
        By registering, you agree that we will mock your attendance choices.
      </div>
    </div>
  );
}
