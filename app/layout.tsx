import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TGMSC Placement Assistant",
  description:
    "Explore placement drives and job roles with clear requirements and AI-assisted recommendations.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
