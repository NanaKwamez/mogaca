import * as React from "react"

export function DataTable({ headers, rows }: { headers: string[], rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="w-full overflow-x-auto scoresheet-wrapper pb-4">
      <table className="w-full text-left data-table border-collapse">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h, i) => (
              <th key={i} className="py-3 px-4 font-semibold text-sm text-text-muted whitespace-nowrap bg-background sticky top-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border hover:bg-background transition-colors bg-surface">
              {row.map((cell, j) => (
                <td key={j} data-label={headers[j]} className="py-3 px-4 text-sm text-text">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
