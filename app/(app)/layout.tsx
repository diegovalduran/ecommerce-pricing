"use client"

import { Sidebar } from "@/components/sidebar"
import { TopNav } from "@/components/top-nav"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopNav />
        {children}
      </div>
    </div>
  )
} 