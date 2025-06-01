"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LandingNavbar } from "@/components/landing-navbar"
import { LandingFooter } from "@/components/landing-footer"
import { LandingHero } from "@/components/landing-hero"
import { LandingFeatures } from "@/components/landing-features"
import { LandingHowItWorks } from "@/components/landing-how-it-works"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background dark:bg-black">
      <LandingNavbar />
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingFooter />
    </div>
  )
}
