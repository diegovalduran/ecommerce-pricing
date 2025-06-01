import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FiTrendingUp, FiShoppingCart, FiShield, FiGlobe } from "react-icons/fi"
import { HeroBackgroundPaths } from "@/components/hero-background-paths"

export function LandingHero() {
  return (
    <section className="relative w-full bg-background dark:bg-black pt-16 pb-20 text-center overflow-hidden">
      <HeroBackgroundPaths />
      <div className="container mx-auto px-4 flex flex-col items-center relative z-10">
        <p className="text-lg text-muted-foreground mb-4">Welcome to DriftPrice</p>
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
          Where Pricing Meets <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-700 bg-clip-text text-transparent">Intelligence</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
          Unlock AI-powered pricing recommendations to maximize your e-commerce revenue and stay ahead of the competition.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mb-8 justify-center">
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-8 py-6">Get Started</Button>
          </Link>
          <Link href="#how-it-works">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">How it works</Button>
          </Link>
        </div>
        {/* Stats Bar - cards with background so SVG is visible beneath */}
        <div className="w-full max-w-5xl flex flex-col md:flex-row justify-center items-stretch mt-8 gap-6">
          {/* Revenue Optimized */}
          <div className="flex flex-col items-center flex-1 py-8 px-4 bg-white/80 dark:bg-zinc-900/80 rounded-2xl shadow-md border border-white/20 dark:border-zinc-800/60">
            <FiTrendingUp size={32} className="mb-3 text-primary" />
            <span className="text-3xl font-bold">$1B+</span>
            <span className="font-semibold text-lg mt-1">Revenue Optimized</span>
            <span className="text-muted-foreground text-sm mt-1">AI-driven pricing for maximum profit</span>
          </div>
          {/* E-commerce Stores */}
          <div className="flex flex-col items-center flex-1 py-8 px-4 bg-white/80 dark:bg-zinc-900/80 rounded-2xl shadow-md border border-white/20 dark:border-zinc-800/60">
            <FiShoppingCart size={32} className="mb-3 text-primary" />
            <span className="text-3xl font-bold">250+</span>
            <span className="font-semibold text-lg mt-1">E-commerce Stores</span>
            <span className="text-muted-foreground text-sm mt-1">Trusted by top online retailers</span>
          </div>
          {/* Uptime Guarantee */}
          <div className="flex flex-col items-center flex-1 py-8 px-4 bg-white/80 dark:bg-zinc-900/80 rounded-2xl shadow-md border border-white/20 dark:border-zinc-800/60">
            <FiShield size={32} className="mb-3 text-primary" />
            <span className="text-3xl font-bold">99.99%</span>
            <span className="font-semibold text-lg mt-1">Uptime Guarantee</span>
            <span className="text-muted-foreground text-sm mt-1">Enterprise-grade reliability</span>
          </div>
          {/* Countries Served */}
          <div className="flex flex-col items-center flex-1 py-8 px-4 bg-white/80 dark:bg-zinc-900/80 rounded-2xl shadow-md border border-white/20 dark:border-zinc-800/60">
            <FiGlobe size={32} className="mb-3 text-primary" />
            <span className="text-3xl font-bold">40+</span>
            <span className="font-semibold text-lg mt-1">Countries Served</span>
            <span className="text-muted-foreground text-sm mt-1">Global reach for your business</span>
          </div>
        </div>
      </div>
    </section>
  )
} 