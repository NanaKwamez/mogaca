import * as React from "react"
import { X } from "lucide-react"
import { Button } from "./Button"

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-surface rounded-lg shadow-modal w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" className="p-1 min-h-0 min-w-0 min-h-0 border-0" onClick={onClose} aria-label="Close modal">
            <X className="w-5 h-5 text-text-muted" />
          </Button>
        </div>
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
