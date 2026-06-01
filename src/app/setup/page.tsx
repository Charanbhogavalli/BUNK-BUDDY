"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowRight, Check } from "lucide-react";
import { dbService, User, Subject, Dialogue } from "@/lib/db";
import { Mascot } from "@/components/Mascot";
import { DialogueBubble } from "@/components/DialogueBubble";

export default function SetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [step, setStep] = useState(1);
  
  // Step 1: Subjects List
  const [subjectNames, setSubjectNames] = useState<string[]>(["DSA", "DBMS", "OS"]);
  const [newSubject, setNewSubject] = useState("");
  
  // Step 2: Initial Attendance
  const [attendanceData, setAttendanceData] = useState<
    Record<string, { attended: number; total: number }>
  >({});
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);

  useEffect(() => {
    const currentUser = dbService.getCurrentUser();
    if (!currentUser) {
      router.push("/");
      return;
    }
    setUser(currentUser);

    setDialogue({
      dialogueId: "setup_start",
      category: "ROAST",
      text: "First step: Tell me what courses you're neglecting. Let's start listing them.",
      rarity: "common",
      active: true,
      createdAt: new Date().toISOString(),
    });
  }, [router]);

  // Initialize Step 2 data when transitioning
  useEffect(() => {
    if (step === 2) {
      const initialData: typeof attendanceData = {};
      subjectNames.forEach((name) => {
        initialData[name] = { attended: 0, total: 0 };
      });
      setAttendanceData(initialData);
      setDialogue({
        dialogueId: "setup_step2",
        category: "ROAST",
        text: "Step two: How many classes have you already skipped or actually sat through? Be honest, I'll know.",
        rarity: "common",
        active: true,
        createdAt: new Date().toISOString(),
      });
    }
  }, [step, subjectNames]);

  const addSubject = () => {
    const name = newSubject.trim();
    if (!name) return;
    if (subjectNames.includes(name)) {
      setError("You're already failing that subject in the list.");
      return;
    }
    setSubjectNames([...subjectNames, name]);
    setNewSubject("");
    setError("");
  };

  const removeSubject = (indexToRemove: number) => {
    setSubjectNames(subjectNames.filter((_, idx) => idx !== indexToRemove));
  };

  const handleNextStep = () => {
    if (subjectNames.length === 0) {
      setError("Add at least one subject, unless you dropped out.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleAttendanceChange = (
    name: string,
    field: "attended" | "total",
    value: string
  ) => {
    const val = Math.max(0, parseInt(value) || 0);
    const updated = { ...attendanceData[name] };
    
    if (field === "attended") {
      updated.attended = val;
      // attended cannot exceed total
      if (updated.attended > updated.total) {
        updated.total = updated.attended;
      }
    } else {
      updated.total = val;
      // total cannot be less than attended
      if (updated.total < updated.attended) {
        updated.attended = updated.total;
      }
    }

    setAttendanceData({
      ...attendanceData,
      [name]: updated,
    });
  };

  const handleFinishSetup = async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      // Save subjects one by one
      for (const name of subjectNames) {
        const data = attendanceData[name] || { attended: 0, total: 0 };
        await dbService.addSubject(user.studentId, name, data.attended, data.total);
      }
      
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initialize subjects.");
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bunk-yellow flex flex-col justify-between max-w-md mx-auto neo-border shadow-2xl p-6">
      {/* Header with step marker */}
      <div className="flex justify-between items-center mt-2 border-b-2 border-black pb-2">
        <span className="font-headline font-black text-2xl uppercase text-black">
          SETUP WIZARD
        </span>
        <span className="bg-black text-bunk-yellow text-xs px-2 py-1 font-bold neo-border-sm">
          STEP {step} OF 2
        </span>
      </div>

      {/* Mascot Interaction */}
      <div className="w-full flex flex-col items-center gap-4 my-4">
        <DialogueBubble dialogue={dialogue} className="w-full" />
        <Mascot status={step === 1 ? "SAFE" : "WARNING"} size={90} />
      </div>

      {/* Steps Content */}
      <div className="bg-black text-white neo-border p-5 rounded-2xl neo-shadow w-full flex-1 flex flex-col justify-between my-2">
        <div>
          {error && (
            <div className="bg-bunk-danger text-black neo-border-sm px-3 py-1.5 font-bold text-xs mb-3 text-center uppercase">
              ⚠️ {error}
            </div>
          )}

          {/* STEP 1: ADD SUBJECTS */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-headline font-black text-xl text-bunk-pink uppercase tracking-wide">
                  ADD YOUR SUBJECTS
                </h3>
                <p className="text-xs text-neutral-400 font-bold mt-1">
                  List your core subjects, labs, or electives.
                </p>
              </div>

              {/* Add Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. DSA, Maths, Lab..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubject()}
                  className="flex-1 bg-white text-black font-sans font-semibold p-2.5 neo-input text-sm rounded-lg"
                />
                <button
                  type="button"
                  onClick={addSubject}
                  className="neo-btn bg-bunk-pink text-white p-2.5 rounded-lg flex items-center justify-center"
                >
                  <Plus className="w-5 h-5 stroke-[3px]" />
                </button>
              </div>

              {/* List of Subjects */}
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 border-2 border-dashed border-neutral-700 rounded-lg">
                {subjectNames.length === 0 ? (
                  <p className="text-xs text-neutral-500 font-bold italic w-full text-center py-4">
                    List is empty. Add a subject.
                  </p>
                ) : (
                  subjectNames.map((name, index) => (
                    <div
                      key={name}
                      className="bg-bunk-yellow text-black font-sans font-extrabold text-xs px-3 py-1.5 rounded-full neo-border-sm flex items-center gap-1.5"
                    >
                      <span>{name}</span>
                      <button
                        type="button"
                        onClick={() => removeSubject(index)}
                        className="text-neutral-700 hover:text-bunk-danger"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 2: CURRENT ATTENDANCE COUNT */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-headline font-black text-xl text-bunk-pink uppercase tracking-wide">
                  CURRENT ATTENDANCE
                </h3>
                <p className="text-xs text-neutral-400 font-bold mt-1">
                  How many lectures have already happened?
                </p>
              </div>

              {/* Subject Rows */}
              <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                {subjectNames.map((name) => {
                  const data = attendanceData[name] || { attended: 0, total: 0 };
                  const pct = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 100;
                  return (
                    <div key={name} className="bg-neutral-900 border-2 border-black p-3 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-headline font-bold text-sm text-bunk-yellow">
                          {name}
                        </span>
                        <span className="bg-white text-black font-extrabold px-1.5 py-0.5 text-[10px] neo-border-sm">
                          {pct}% Attendance
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {/* Attended Count */}
                        <div>
                          <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                            ATTENDED LECTURES
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={data.attended}
                            onChange={(e) =>
                              handleAttendanceChange(name, "attended", e.target.value)
                            }
                            className="w-full bg-white text-black font-sans font-bold p-1.5 neo-input text-xs rounded-lg"
                          />
                        </div>

                        {/* Total Count */}
                        <div>
                          <label className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">
                            TOTAL LECTURES
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={data.total}
                            onChange={(e) =>
                              handleAttendanceChange(name, "total", e.target.value)
                            }
                            className="w-full bg-white text-black font-sans font-bold p-1.5 neo-input text-xs rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Button inside Box */}
        <div className="mt-6 border-t border-dashed border-neutral-700 pt-4">
          {step === 1 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="w-full neo-btn bg-bunk-yellow text-black font-headline font-black text-lg py-3 uppercase tracking-widest rounded-xl flex items-center justify-center gap-2"
            >
              NEXT STEP <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishSetup}
              disabled={loading}
              className="w-full neo-btn bg-bunk-green text-white font-headline font-black text-lg py-3 uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? "INITIALIZING..." : (
                <>
                  FINISH SETUP <Check className="w-5 h-5 stroke-[3px]" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs font-bold text-neutral-700 mt-2 select-none">
        You can always add more subjects later. Do not panic.
      </div>
    </div>
  );
}
