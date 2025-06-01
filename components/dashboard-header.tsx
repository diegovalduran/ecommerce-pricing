import { cn } from "@/lib/utils"
import type React from "react"

interface DashboardHeaderProps {
  heading: string
  text?: string
  children?: React.ReactNode
  className?: string
}

export function DashboardHeader({ heading, text, children, className }: DashboardHeaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-5 px-4 mb-3 border-b", className)}>
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-2xl font-medium tracking-tight mb-1">{heading}</h1>
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}
