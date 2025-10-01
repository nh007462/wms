import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WebRTC Music Session",
  description: "Real-time collaborative music session app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen flex flex-col`}>
        <Header />
        <main className="flex-grow container mx-auto p-4 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}