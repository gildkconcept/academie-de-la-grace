'use client'

import * as React from "react"

export const Card = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={`bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] rounded-xl ${className}`}
      {...props}
    />
  )
}

export const CardHeader = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={`flex flex-col space-y-1.5 p-6 border-b border-white/[0.06] ${className}`}
      {...props}
    />
  )
}

export const CardTitle = ({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h3
      className={`text-lg font-normal leading-none tracking-tight text-white/90 ${className}`}
      style={{ fontFamily: "'Playfair Display', serif" }}
      {...props}
    />
  )
}

export const CardContent = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`p-6 pt-0 mt-4 ${className}`} {...props} />
  )
}