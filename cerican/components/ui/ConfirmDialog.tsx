import * as React from "react"
import { Modal } from "./Modal"
import { Button } from "./Button"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ isOpen, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", variant = "danger", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <p className="text-sm text-text-muted mb-6">{description}</p>
      <div className="flex gap-3 mt-4 items-center justify-end">
        <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}
