import React from "react";

interface MascotProps {
  status: "SAFE" | "WARNING" | "CRITICAL";
  size?: number;
  className?: string;
}

export const Mascot: React.FC<MascotProps> = ({ status, size = 150, className = "" }) => {
  // Determine colors based on status
  const getColors = () => {
    switch (status) {
      case "SAFE":
        return {
          body: "#3CC49F", // Mint Teal
          border: "#000000",
          shadow: "#1A5C4A",
          eyeBg: "#0A0A0A",
        };
      case "WARNING":
        return {
          body: "#F59E0B", // Warning Orange
          border: "#000000",
          shadow: "#925F07",
          eyeBg: "#FFFFFF",
        };
      case "CRITICAL":
        return {
          body: "#EF4444", // Danger Red
          border: "#000000",
          shadow: "#991B1B",
          eyeBg: "#0A0A0A",
        };
      default:
        return {
          body: "#3CC49F",
          border: "#000000",
          shadow: "#1A5C4A",
          eyeBg: "#0A0A0A",
        };
    }
  };

  const colors = getColors();

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative select-none transition-all duration-300 transform hover:scale-105 active:scale-95 ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] animate-bounce-subtle"
      >
        {/* Shadow under body */}
        <ellipse cx="50" cy="88" rx="35" ry="6" fill="#000000" fillOpacity="0.2" />

        {/* Mascot Body */}
        <path
          d="M 15,82 C 15,35 30,16 50,16 C 70,16 85,35 85,82 C 85,85 15,85 15,82 Z"
          fill={colors.body}
          stroke={colors.border}
          strokeWidth="4.5"
          strokeLinejoin="round"
        />

        {/* Mascot Body Shading (inner shadow at bottom) */}
        <path
          d="M 17,81 C 25,83 75,83 83,81 C 81,83 19,83 17,81 Z"
          fill={colors.shadow}
        />

        {/* EXPRESSIONS */}
        {status === "SAFE" && (
          <>
            {/* Sunglasses Frame */}
            <path
              d="M 22,46 C 22,41 33,40 46,43 C 49,43 51,43 54,43 C 67,40 78,41 78,46 C 78,54 67,56 54,54 C 51,54 49,54 46,54 C 33,56 22,54 22,46 Z"
              fill="#0A0A0A"
              stroke="#000000"
              strokeWidth="1.5"
            />
            {/* Sunglasses Lenses */}
            <rect x="25" y="44" width="20" height="8" rx="4" fill="#0A0A0A" />
            <rect x="55" y="44" width="20" height="8" rx="4" fill="#0A0A0A" />
            {/* Sunglasses Highlights */}
            <path d="M 28,46 L 33,46" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 58,46 L 63,46" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            {/* Cool Grin */}
            <path
              d="M 38,64 Q 50,74 62,64"
              stroke="#000000"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Smirk Line */}
            <path d="M 36,65 L 39,63" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
            <path d="M 64,65 L 61,63" stroke="#000000" strokeWidth="3" strokeLinecap="round" />
          </>
        )}

        {status === "WARNING" && (
          <>
            {/* Wide Nervous Eyes */}
            <circle cx="36" cy="45" r="10" fill="#FFFFFF" stroke="#000000" strokeWidth="4" />
            <circle cx="64" cy="45" r="10" fill="#FFFFFF" stroke="#000000" strokeWidth="4" />
            
            {/* Pupils looking slightly sideways/worried */}
            <circle cx="38" cy="45" r="4.5" fill="#0A0A0A" />
            <circle cx="62" cy="45" r="4.5" fill="#0A0A0A" />

            {/* Worried Eyebrows */}
            <path d="M 24,32 Q 35,36 43,30" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M 76,32 Q 65,36 57,30" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" fill="none" />

            {/* Sweat Drop */}
            <path
              d="M 81,38 C 81,42 77,45 77,45 C 77,45 73,42 73,38 C 73,34 77,31 77,31 C 77,31 81,34 81,38 Z"
              fill="#38BDF8"
              stroke="#000000"
              strokeWidth="1.5"
            />

            {/* Nervous Grimace Mouth */}
            <rect x="36" y="62" width="28" height="9" rx="4.5" fill="#FFFFFF" stroke="#000000" strokeWidth="4.5" />
            {/* Teeth lines */}
            <line x1="43" y1="62" x2="43" y2="71" stroke="#000000" strokeWidth="2.5" />
            <line x1="50" y1="62" x2="50" y2="71" stroke="#000000" strokeWidth="2.5" />
            <line x1="57" y1="62" x2="57" y2="71" stroke="#000000" strokeWidth="2.5" />
          </>
        )}

        {status === "CRITICAL" && (
          <>
            {/* Dead X Eyes */}
            <path d="M 28,38 L 40,50 M 40,38 L 28,50" stroke="#000000" strokeWidth="5.5" strokeLinecap="round" />
            <path d="M 60,38 L 72,50 M 72,38 L 60,50" stroke="#000000" strokeWidth="5.5" strokeLinecap="round" />

            {/* Sad Slanted Mouth */}
            <path
              d="M 38,70 Q 50,58 62,70"
              stroke="#000000"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />

            {/* Skull forehead cracks */}
            <path d="M 50,18 L 50,26 L 53,28" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          </>
        )}
      </svg>
    </div>
  );
};
