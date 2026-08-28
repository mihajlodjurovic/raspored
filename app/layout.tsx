import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Raspored · Work Schedule",
  description: "Work shift scheduling for VUKAS",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href={session ? (session.role === "admin" ? "/admin" : "/employee") : "/"} className="brand">
              Raspored
            </Link>
            <nav className="nav">
              {session ? (
                <>
                  {session.role === "admin" ? (
                    <Link href="/admin" className="nav-link">
                      Admin Panel
                    </Link>
                  ) : (
                    <Link href="/employee" className="nav-link">
                      My Shifts
                    </Link>
                  )}
                  <span className="nav-user">
                    {session.username} · {session.role}
                  </span>
                  <LogoutButton />
                </>
              ) : (
                <Link href="/login" className="nav-link">
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}