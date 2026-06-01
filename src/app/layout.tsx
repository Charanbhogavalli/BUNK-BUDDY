import type { Metadata } from "next";
import { Bricolage_Grotesque, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { MascotProvider } from "@/components/MascotContext";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BunkBuddy | Bunk Calculator",
  description: "The attendance app that judges your life choices. Track attendance, safe bunks, and get roasted by our mascot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bricolage.variable} ${spaceGrotesk.variable} antialiased selection:bg-bunk-pink selection:text-white`}
      >
        <MascotProvider>{children}</MascotProvider>
      </body>
    </html>
  );
}
