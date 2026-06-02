"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Dialogue, dbService } from "@/lib/db";

interface MascotContextType {
  status: "SAFE" | "WARNING" | "CRITICAL";
  setStatus: (s: "SAFE" | "WARNING" | "CRITICAL") => void;
  dialogue: Dialogue | null;
  setDialogue: (d: Dialogue | null) => void;
  triggerRefresh: number;
  refreshData: () => void;
}

const MascotContext = createContext<MascotContextType | undefined>(undefined);

export const MascotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<"SAFE" | "WARNING" | "CRITICAL">("SAFE");
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  const refreshData = () => {
    setTriggerRefresh((prev) => prev + 1);
  };

  useEffect(() => {
    // Fetch an initial welcome roast on first boot
    const currentUser = dbService.getCurrentUser();
    if (currentUser) {
      dbService.getRandomDialogue("ROAST")
        .then((d) => {
          setDialogue(d);
        })
        .catch((e) => console.warn("Could not load initial dialogue:", e));
    }
  }, []);

  return (
    <MascotContext.Provider
      value={{
        status,
        setStatus,
        dialogue,
        setDialogue,
        triggerRefresh,
        refreshData,
      }}
    >
      {children}
    </MascotContext.Provider>
  );
};

export const useMascot = () => {
  const context = useContext(MascotContext);
  if (!context) {
    throw new Error("useMascot must be used within MascotProvider");
  }
  return context;
};
