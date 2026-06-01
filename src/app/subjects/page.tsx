"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Plus, X, ArrowRight, Award } from "lucide-react";
import Link from "next/link";
import {
  dbService,
  Subject,
  User,
  calculateAttendancePercentage,
  calculateSafeBunks,
  getSubjectRiskLevel,
  SubjectRiskLevel,
} from "@/lib/db";

export default function SubjectsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Subject Form
  const [newSubjName, setNewSubjName] = useState("");
  const [newSubjAttended, setNewSubjAttended] = useState("0");
  const [newSubjTotal, setNewSubjTotal] = useState("0");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadSubjects = async (studentId: string) => {
    try {
      const data = await dbService.getSubjects(studentId);
      setSubjects(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const currentUser = dbService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      loadSubjects(currentUser.studentId);
    }
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const name = newSubjName.trim();
    if (!name) {
      setError("Name is required, slacker.");
      return;
    }

    const attended = parseInt(newSubjAttended) || 0;
    const total = parseInt(newSubjTotal) || 0;

    if (attended < 0 || total < 0) {
      setError("Lectures cannot be negative.");
      return;
    }

    if (attended > total) {
      setError("Attended classes cannot exceed total classes. Paradox detected.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await dbService.addSubject(user.studentId, name, attended, total);
      setNewSubjName("");
      setNewSubjAttended("0");
      setNewSubjTotal("0");
      setIsModalOpen(false);
      await loadSubjects(user.studentId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add subject.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeStyles = (risk: SubjectRiskLevel) => {
    switch (risk) {
      case "Academic Weapon":
        return "bg-bunk-green text-black";
      case "Safe":
        return "bg-bunk-green text-white";
      case "Careful":
        return "bg-bunk-warning text-black animate-pulse";
      case "Danger":
        return "bg-bunk-danger text-white";
      default:
        return "bg-bunk-danger text-white underline font-black";
    }
  };

  const memoizedSubjectsList = useMemo(() => {
    if (subjects.length === 0) {
      return (
        <div className="bg-black text-white p-6 rounded-2xl neo-border text-center neo-shadow my-4 flex-1 flex flex-col justify-center items-center">
          <Award className="w-12 h-12 text-bunk-pink mb-3 animate-bounce" />
          <p className="font-headline font-bold text-lg mb-1">NO COURSES REGISTERED</p>
          <p className="text-xs text-neutral-400 font-bold max-w-xs leading-relaxed">
            Tap the pink (+) floating button at the bottom-right corner to list a course.
          </p>
        </div>
      );
    }

    const req = user?.requiredAttendance || 75;

    return (
      <div className="flex flex-col gap-4">
        {subjects.map((subj) => {
          const pct = calculateAttendancePercentage(subj.attendedClasses, subj.totalClasses);
          const safeCount = calculateSafeBunks(subj.attendedClasses, subj.totalClasses, req);
          const risk = getSubjectRiskLevel(pct);

          return (
            <Link
              key={subj.subjectId}
              href={`/subjects/${subj.subjectId}`}
              className="bg-bunk-card text-white p-5 rounded-2xl neo-border neo-shadow hover:translate-x-1 transition-all block group"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-headline font-black text-xl uppercase tracking-wider text-bunk-yellow group-hover:text-bunk-pink transition-colors">
                    {subj.subjectName}
                  </h3>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="text-[10px] font-extrabold text-neutral-400 uppercase">
                      Classes: {subj.attendedClasses} / {subj.totalClasses}
                    </span>
                  </div>
                </div>
                {/* Big Percentage Badge */}
                <span className="bg-white text-black font-headline font-black text-base px-2.5 py-1.5 neo-border-sm">
                  {pct}%
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-neutral-800 border-dashed my-3"></div>

              <div className="flex justify-between items-center text-xs">
                {/* Safe Bunks count */}
                <span className="font-bold">
                  Safe Bunks Left:{" "}
                  <span className={safeCount > 0 ? "text-bunk-green font-extrabold" : "text-bunk-danger font-extrabold"}>
                    {safeCount}
                  </span>
                </span>

                {/* Risk Badge */}
                <span className={`text-[10px] font-black px-2 py-0.5 uppercase neo-border-sm ${getRiskBadgeStyles(risk)}`}>
                  {risk}
                </span>
              </div>
              
              {/* Click indicator */}
              <div className="flex justify-end items-center gap-1 mt-2 text-[10px] font-bold text-neutral-400 group-hover:text-white transition-colors">
                <span>View Calendar & Calculator</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>
    );
  }, [subjects, user?.requiredAttendance]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-4 relative min-h-[calc(100vh-12rem)]">
        {/* Title */}
        <div className="border-b-2 border-black pb-2 flex justify-between items-center">
          <div>
            <h1 className="font-headline font-black text-2xl uppercase tracking-wide text-black">
              YOUR SUBJECTS
            </h1>
            <p className="text-[10px] font-bold text-neutral-700 italic mt-0.5">
              Don&apos;t get debarred, stay casual.
            </p>
          </div>
          <span className="bg-black text-bunk-yellow text-xs font-black px-2 py-0.5 neo-border-sm">
            {subjects.length} Total
          </span>
        </div>

        {/* Subjects List */}
        {memoizedSubjectsList}

        {/* Floating Action Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-24 right-6 md:right-[calc(50vw-12rem+1.5rem)] w-14 h-14 bg-bunk-pink text-white rounded-full neo-border neo-shadow flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
        >
          <Plus className="w-8 h-8 stroke-[3px]" />
        </button>

        {/* Add Subject Modal overlay */}
        {isModalOpen && (
          <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4 rounded-3xl">
            <div className="bg-black text-white neo-border p-6 rounded-2xl w-full neo-shadow-lg max-w-sm relative">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <h3 className="font-headline font-black text-xl text-bunk-pink uppercase tracking-wide mb-4">
                ADD SUBJECT
              </h3>

              {error && (
                <div className="bg-bunk-danger text-black neo-border-sm px-3 py-1.5 font-bold text-xs mb-3 text-center uppercase">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleAddSubject} className="flex flex-col gap-3">
                {/* Subject Name */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-300 uppercase tracking-widest mb-1">
                    SUBJECT NAME
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DBMS, Maths, Lab"
                    value={newSubjName}
                    onChange={(e) => setNewSubjName(e.target.value)}
                    className="w-full bg-white text-black font-sans font-semibold p-2 neo-input text-xs rounded-lg"
                  />
                </div>

                {/* Initial Counts */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-300 uppercase tracking-widest mb-1">
                      ATTENDED
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newSubjAttended}
                      onChange={(e) => setNewSubjAttended(e.target.value)}
                      className="w-full bg-white text-black font-sans font-bold p-2 neo-input text-xs rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-neutral-300 uppercase tracking-widest mb-1">
                      TOTAL CLASSES
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newSubjTotal}
                      onChange={(e) => setNewSubjTotal(e.target.value)}
                      className="w-full bg-white text-black font-sans font-bold p-2 neo-input text-xs rounded-lg"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full neo-btn bg-bunk-yellow text-black font-headline font-black text-sm py-3 uppercase tracking-widest rounded-xl mt-3 block"
                >
                  {loading ? "ADDING..." : "ADD COURSE"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
