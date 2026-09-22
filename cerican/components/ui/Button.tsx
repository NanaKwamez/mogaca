import * as React from "react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', ...props }, ref) => {
    const baseClass = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 min-h-[44px] px-4 py-2"
    
    const variants = {
      primary: "bg-primary text-text-inv hover:bg-primary-light",
      secondary: "border border-border bg-transparent hover:bg-background text-text",
      danger: "bg-danger text-white hover:bg-red-700",
      ghost: "hover:bg-background text-text bg-transparent"
    }

    return (
      <button
        ref={ref}
        className={`${baseClass} ${variants[variant]} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
