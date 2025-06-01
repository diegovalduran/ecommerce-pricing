"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"

export function LandingNavbar() {
  return (
    <nav className="w-full bg-background border-b border-border dark:bg-black dark:border-neutral-800">
      <div className="container mx-auto flex items-center justify-between py-3 px-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="DriftPrice Logo" width={40} height={40} className="rounded-full" />
          <span className="text-2xl font-extrabold tracking-tight">DRIFTPRICE</span>
        </div>
        {/* Nav Links */}
        <div className="hidden md:flex gap-8 items-center">
          <Link href="/" className="font-medium hover:underline underline-offset-4">Home</Link>
          <Link href="#features" className="font-medium hover:underline underline-offset-4">Features</Link>
          <Link href="#how-it-works" className="font-medium hover:underline underline-offset-4">How it works</Link>
          <span className="font-medium text-muted-foreground cursor-not-allowed">Contact</span>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/dashboard">
            <Button variant="ghost" className="font-semibold">Sign In</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
} 