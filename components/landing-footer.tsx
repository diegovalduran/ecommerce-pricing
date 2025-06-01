import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FaInstagram, FaFacebook, FaTwitter } from "react-icons/fa"
import Image from "next/image"

export function LandingFooter() {
  return (
    <footer className="w-full bg-background border-t border-border dark:bg-black dark:border-neutral-800 mt-24">
      <div className="container mx-auto py-12 px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand/Description */}
        <div>
          <div className="mb-2">
            <span className="text-2xl font-extrabold tracking-tight">DRIFTPRICE</span>
          </div>
          <p className="text-muted-foreground text-sm max-w-xs">
            AI-powered e-commerce pricing recommendations to maximize your revenue and stay ahead of the market.
          </p>
        </div>
        {/* Navigation */}
        <div>
          <h4 className="font-semibold mb-3">Navigation</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:underline">Home</Link></li>
            <li><Link href="#features" className="hover:underline">Features</Link></li>
            <li><Link href="#how-it-works" className="hover:underline">How it works</Link></li>
            <li><span className="text-muted-foreground cursor-not-allowed">Contact</span></li>
          </ul>
        </div>
        {/* Contact */}
        <div>
          <h4 className="font-semibold mb-3">Contact</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>123 Commerce Ave</div>
            <div>San Francisco, CA 94105</div>
            <div>info@driftprice.com</div>
            <div>+1 (555) 123-4567</div>
          </div>
        </div>
        {/* Connect */}
        <div>
          <h4 className="font-semibold mb-3">Connect</h4>
          <div className="flex gap-4 mb-4">
            <a href="#" aria-label="Instagram" className="hover:text-primary"><FaInstagram size={22} /></a>
            <a href="#" aria-label="Facebook" className="hover:text-primary"><FaFacebook size={22} /></a>
            <a href="#" aria-label="Twitter" className="hover:text-primary"><FaTwitter size={22} /></a>
          </div>
          <div>
            <h5 className="font-medium mb-1">Subscribe</h5>
            <form className="flex gap-2">
              <Input type="email" placeholder="Your email" className="bg-background" />
              <Button type="submit">Subscribe</Button>
            </form>
          </div>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DriftPrice. All rights reserved.
      </div>
    </footer>
  )
} 