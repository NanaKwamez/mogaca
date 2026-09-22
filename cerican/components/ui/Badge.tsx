import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default'
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const base = "inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
  const variants = {
    default: "border-transparent bg-background text-text",
    success: "border-transparent bg-success text-white",
    warning: "border-transparent bg-warning text-white",
    danger: "border-transparent bg-danger text-white",
    info: "border-transparent bg-info text-white"
  }
  
  return (
    <div className={`${base} ${variants[variant]} ${className}`} {...props} />
  )
}
