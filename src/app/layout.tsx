import type { Metadata, Viewport } from "next";
import { Noto_Sans_Kannada, Plus_Jakarta_Sans } from "next/font/google";
import { SwRegister } from "@/components/SwRegister";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });
const kannada = Noto_Sans_Kannada({ variable: "--font-kannada", subsets: ["kannada"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Maathaadi · Speak Kannada for real Bengaluru moments",
  description: "Practise spoken Kannada with friendly AI characters: an auto ride, a vegetable stall, a bus, a clinic. See whether a local would understand you.",
  manifest: "/manifest.webmanifest",
  applicationName: "Maathaadi",
  appleWebApp: { capable: true, title: "Maathaadi", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" }, { url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#14110e" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${kannada.variable} antialiased`}>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
