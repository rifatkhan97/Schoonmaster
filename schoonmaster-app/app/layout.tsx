import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Schoonmaster | Operations Platform",
    template: "%s | Schoonmaster",
  },
  description:
    "Schoonmaster BV — Digital operations platform for commercial cleaning workforce management, scheduling, and service ordering.",
  keywords: ["cleaning", "operations", "scheduling", "schoonmaker", "facility management"],
  authors: [{ name: "Schoonmaster BV" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Schoonmaster",
  },
  openGraph: {
    type: "website",
    siteName: "Schoonmaster",
    title: "Schoonmaster Operations Platform",
    description: "Digital operations platform for commercial cleaning workforce management.",
  },
};

export const viewport: Viewport = {
  themeColor: "#14c9b8",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <head>
        <link rel="icon" href="/icons/icon-32x32.png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>{children}</body>
    </html>
  );
}
