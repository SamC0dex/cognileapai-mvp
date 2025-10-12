"use client"

import Link from "next/link"

export default function LandingFooter() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} CogniLeap. All rights reserved.</p>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/auth/login" className="hover:text-foreground">Get started</Link>
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
      </div>
    </footer>
  )
}
