"use client"

import React from "react"
import { Button } from "./Button"

export function PrintButton({ label = "Print Master Sheet" }: { label?: string }) {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="print:hidden bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 shadow-sm"
    >
      <span>🖨️</span>
      <span>{label}</span>
    </Button>
  )
}
