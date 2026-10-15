import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Bayora Blind Arena", description: "Provably fair AI red/blue testing" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-grid min-h-screen antialiased">{children}</body>
    </html>
  );
}
