import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outfit Visual Studio",
  description: "AI visual workflow for outfit content."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
