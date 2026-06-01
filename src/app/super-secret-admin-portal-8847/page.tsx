"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dbService, Dialogue, User } from "@/lib/db";
import { ArrowLeft, Trash2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function SuperSecretAdminPortal() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);

  // Dialogues state
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Create form
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState<Dialogue["category"]>("ROAST");
  const [newRarity, setNewRarity] = useState<Dialogue["rarity"]>("common");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDialogues = async () => {
    try {
      const data = await dbService.getDialogues();
      setDialogues(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const currentUser = dbService.getCurrentUser();
    setUser(currentUser);
    
    // Strict Admin Authorization checks
    if (!currentUser) {
      router.push("/");
      return;
    }

    if (currentUser.admin !== true) {
      // Normal student - redirect away!
      router.push("/dashboard");
      return;
    }

    setAuthorized(true);
    loadDialogues();
  }, [router]);

  const handleAddDialogue = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newText.trim();
    if (!text) {
      setError("Dialogue text is required.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await dbService.addDialogue(newCategory, text, newRarity);
      setNewText("");
      await loadDialogues();
    } catch (err) {
      setError("Failed to create dialogue.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (dialogId: string, currentStatus: boolean) => {
    try {
      await dbService.updateDialogue(dialogId, { active: !currentStatus });
      await loadDialogues();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDialogue = async (dialogId: string) => {
    if (confirm("Permanently delete this dialogue line?")) {
      try {
        await dbService.deleteDialogue(dialogId);
        await loadDialogues();
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (!authorized || !user) {
    return (
      <div className="min-h-screen bg-bunk-yellow flex flex-col justify-center items-center p-6">
        <div className="font-headline font-black text-xl animate-pulse">
          VERIFYING ADMIN PRIVILEGES...
        </div>
      </div>
    );
  }

  const filteredDialogues = categoryFilter === "ALL"
    ? dialogues
    : dialogues.filter((d) => d.category === categoryFilter);

  return (
    <div className="min-h-screen bg-bunk-yellow flex flex-col max-w-md mx-auto neo-border shadow-2xl p-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
        <Link
          href="/dashboard"
          className="neo-btn bg-white text-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
        <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 uppercase neo-border-sm">
          CONSOLE ACTIVE
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {/* CREATE DIALOGUE CARD */}
        <div className="bg-black text-white p-5 rounded-2xl neo-border neo-shadow">
          <h2 className="font-headline font-black text-lg text-bunk-pink uppercase mb-3">
            CREATE DIALOGUE
          </h2>

          {error && (
            <div className="bg-bunk-danger text-black neo-border-sm px-3 py-1.5 font-bold text-xs mb-3 text-center uppercase">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleAddDialogue} className="flex flex-col gap-3">
            {/* Textarea */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-300 uppercase tracking-widest mb-1">
                DIALOGUE QUOTE TEXT
              </label>
              <textarea
                placeholder="Enter witty dialogue, roast, or congrats..."
                rows={2}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full bg-white text-black font-sans font-semibold p-2 neo-input text-xs rounded-lg resize-none"
              />
            </div>

            {/* Category & Rarity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-neutral-300 uppercase tracking-widest mb-1">
                  CATEGORY
                </label>
                <select
                  value={newCategory}
                  onChange={(e: any) => setNewCategory(e.target.value)}
                  className="w-full bg-white text-black font-sans font-bold p-2 neo-input text-xs rounded-lg cursor-pointer"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="SAFE">SAFE</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="ROAST">ROAST</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-300 uppercase tracking-widest mb-1">
                  RARITY
                </label>
                <select
                  value={newRarity}
                  onChange={(e: any) => setNewRarity(e.target.value)}
                  className="w-full bg-white text-black font-sans font-bold p-2 neo-input text-xs rounded-lg cursor-pointer"
                >
                  <option value="common">Common (89%)</option>
                  <option value="rare">Rare (10%)</option>
                  <option value="legendary">Legendary (1%)</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full neo-btn bg-bunk-yellow text-black font-headline font-black text-xs py-2.5 uppercase tracking-widest rounded-xl mt-2 block"
            >
              {loading ? "CREATING..." : "ADD DIALOGUE LINE"}
            </button>
          </form>
        </div>

        {/* DIALOGUES LIST CARD */}
        <div className="bg-black text-white p-5 rounded-2xl neo-border neo-shadow flex-1 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
            <h2 className="font-headline font-black text-sm uppercase text-bunk-yellow">
              MANAGE DIALOGUES ({filteredDialogues.length})
            </h2>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 text-white font-bold p-1 text-[10px] uppercase rounded"
            >
              <option value="ALL">ALL CATEGORIES</option>
              <option value="PRESENT">PRESENT</option>
              <option value="ABSENT">ABSENT</option>
              <option value="SAFE">SAFE</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="ROAST">ROAST</option>
            </select>
          </div>

          {/* List content */}
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredDialogues.length === 0 ? (
              <p className="text-xs text-neutral-500 italic text-center py-8">
                No dialogue matches in this filter.
              </p>
            ) : (
              filteredDialogues.map((d) => (
                <div key={d.dialogueId} className="bg-neutral-900 border border-neutral-800 p-3 rounded-lg flex flex-col gap-2 relative">
                  <div className="flex justify-between items-center">
                    <div className="flex gap-1.5 items-center">
                      <span className="bg-neutral-800 text-neutral-300 text-[8px] font-black px-1.5 py-0.2 rounded uppercase">
                        {d.category}
                      </span>
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                        d.rarity === "legendary" ? "bg-purple-600 text-white" :
                        d.rarity === "rare" ? "bg-bunk-pink text-white" : "bg-neutral-700 text-neutral-300"
                      }`}>
                        {d.rarity}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(d.dialogueId, d.active)}
                      className={`text-[9px] font-black uppercase flex items-center gap-1 ${
                        d.active ? "text-bunk-green" : "text-neutral-500"
                      }`}
                    >
                      {d.active ? (
                        <>
                          <CheckCircle className="w-3 h-3" /> Active
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> Disabled
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs font-semibold text-neutral-200 leading-relaxed italic">
                    &ldquo;{d.text}&rdquo;
                  </p>

                  <div className="flex justify-end border-t border-neutral-800 pt-1.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => handleDeleteDialogue(d.dialogueId)}
                      className="text-neutral-500 hover:text-bunk-danger transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
