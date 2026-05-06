'use client'

import * as React from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50 disabled:pointer-events-none"
    
    const variants = {
      default: "bg-white text-[#1a3a8f] hover:shadow-lg hover:-translate-y-0.5",
      destructive: "bg-red-500/20 text-red-300 hover:bg-red-500/30",
      outline: "border border-white/20 bg-transparent text-white/80 hover:bg-white/10",
      secondary: "bg-white/10 text-white/80 hover:bg-white/20",
      ghost: "text-white/60 hover:text-white hover:bg-white/10"
    }
    
    const sizes = {
      default: "h-10 py-2 px-4 text-sm",
      sm: "h-8 px-3 text-xs",
      lg: "h-12 px-6 text-base"
    }
    
    return (
      <button
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"