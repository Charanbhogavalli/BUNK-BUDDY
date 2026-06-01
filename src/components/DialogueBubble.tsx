import React from "react";
import { Dialogue } from "@/lib/db";

interface DialogueBubbleProps {
  dialogue: Dialogue | null;
  className?: string;
}

export const DialogueBubble: React.FC<DialogueBubbleProps> = ({ dialogue, className = "" }) => {
  if (!dialogue) return null;

  const getRarityStyles = () => {
    switch (dialogue.rarity) {
      case "legendary":
        return {
          border: "border-[4px] border-black animate-pulse",
          bg: "bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white",
          badge: "bg-black text-yellow-400 font-extrabold neo-border-sm px-2 py-0.5 text-xs uppercase tracking-wider rounded-none inline-block mb-1.5",
          shadow: "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]",
        };
      case "rare":
        return {
          border: "border-[3px] border-black",
          bg: "bg-bunk-card text-white",
          badge: "bg-bunk-pink text-white font-bold neo-border-sm px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-none inline-block mb-1.5",
          shadow: "shadow-[5px_5px_0px_0px_rgba(255,79,163,0.7)]",
        };
      default:
        return {
          border: "border-[3px] border-black",
          bg: "bg-bunk-card text-white",
          badge: "",
          shadow: "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
        };
    }
  };

  const styles = getRarityStyles();

  return (
    <div className={`relative ${className}`}>
      {/* Speech Bubble Tail Wrapper */}
      <div
        className={`rounded-2xl p-4 ${styles.bg} ${styles.border} ${styles.shadow} transition-all duration-300`}
      >
        {dialogue.rarity === "legendary" && (
          <div className={styles.badge}>
            🏆 LEGENDARY UNLOCKED
          </div>
        )}
        {dialogue.rarity === "rare" && (
          <div className={styles.badge}>
            ✨ RARE REACTION
          </div>
        )}
        
        <p className="font-sans font-semibold text-sm md:text-base leading-relaxed tracking-wide">
          &ldquo;{dialogue.text}&rdquo;
        </p>
      </div>

      {/* Bubble Triangle Tail pointing down-left to mascot */}
      <div className="absolute -bottom-3 left-8 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-black"></div>
      <div className={`absolute -bottom-2 left-[33px] w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[9px] ${dialogue.rarity === "legendary" ? "border-t-pink-500" : "border-t-bunk-card"}`}></div>
    </div>
  );
};
