import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "RelAI — AI Relationship Coach",
  description:
    "Why do you keep having the same fight? Find your relationship archetype in 5 minutes. AI coaching grounded in Gottman Method, attachment theory, and EFT.",
  openGraph: {
    title: "RelAI — AI Relationship Coach",
    description:
      "Find your relationship archetype in 5 minutes. Understand your patterns, find the words, then go have the real conversation.",
    siteName: "RelAI",
    type: "website",
    url: "https://relai-pi.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "RelAI — AI Relationship Coach",
    description:
      "Find your relationship archetype in 5 minutes. AI coaching grounded in 40+ years of relationship research.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${plusJakarta.variable} ${beVietnam.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
