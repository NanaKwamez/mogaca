import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1">
        {label && <label className="text-sm font-semibold text-text">{label}</label>}
        <input
          className={`flex h-[44px] w-full rounded-md border ${error ? 'border-danger' : 'border-border'} bg-surface px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
          ref={ref}
          {...props}
        />
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    )
  }
)
Input.displayName = "Input"
