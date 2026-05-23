import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  title: "Bizim Harita | İlişkilerin Dijital Hafızası 🗺️❤️",
  description: "Çiftlerin birlikte keşfettikleri yerleri, fotoğrafları, notları ve tüm anıları ortak bir dijital zaman tünelinde ve haritada biriktirdiği romantik, gizli sığınak.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bizim Harita",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${quicksand.variable} h-full antialiased`}>
      <body className={`${quicksand.className} min-h-full flex flex-col bg-[#FFFDF9] text-[#3D3A45]`}>
        {children}
      </body>
    </html>
  );
}
