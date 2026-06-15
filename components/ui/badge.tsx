'use client'

import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'danger' | 'info' | 'warning' | 'default'
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    const variants = {
      success: "bg-green-500/20 text-green-300 border border-green-500/20",
      danger: "bg-red-500/20 text-red-300 border border-red-500/20",
      info: "bg-blue-500/20 text-blue-300 border border-blue-500/20",
      warning: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/20",
      default: "bg-white/10 text-white/70 border border-white/10"
    }
    
    return (
      <div
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Badge.displayName = "Badge"