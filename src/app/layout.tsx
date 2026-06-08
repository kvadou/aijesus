import type { Metadata, Viewport } from "next";
import { Gentium_Book_Plus, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// The spoken voice. Gentium was designed by SIL for publishing scripture
// worldwide, so the words of Jesus are literally set in a scripture typeface.
const gentium = Gentium_Book_Plus({
  variable: "--font-gentium",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// The interface. A quiet humanist grotesque that stays out of the way.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Speak with Jesus",
  description: "An evidence-grounded, fully auditable reconstruction of Jesus. Every answer cited.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#fafaf9",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${gentium.variable} ${hanken.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
