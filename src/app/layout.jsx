 import { Inter, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ConditionalNav, ConditionalFooter } from "@/components/ConditionalNavFooter";
import ChatWidget from "@/components/ChatWidget";
import CookieConsent from "@/components/CookieConsent";
import ThemeProvider from "@/components/ThemeProvider";
import Analytics from "@/components/Analytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400","500","600","700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Mullen Analytics | EMS, Healthcare & Public Safety Analytics Consulting",
  description: "Mullen Analytics builds forecasting models, dashboards, and AI systems for EMS, fire, hospitals, and healthcare organizations. Explainable, defensible analytics for high-stakes operational decisions.",
  icons: {
    icon: [
      "/favicon.ico",
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <Analytics />
        <ThemeProvider>
          <ConditionalNav />
          <main className="flex-1">{children}</main>
          <ConditionalFooter />
          <ChatWidget />
          <CookieConsent />
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}

