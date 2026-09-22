import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 12 },
  header: { fontSize: 16, marginBottom: 8, textAlign: 'center' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 4, marginBottom: 6 },
  row: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  cellRank: { width: '10%' },
  cellName: { width: '50%' },
  cellAgg: { width: '20%', textAlign: 'right' },
  cellOutOf: { width: '20%', textAlign: 'right' },
})

export default function OrderOfMeritPDF({ schoolName, className, termName, rows }: any) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>{schoolName || 'School'} · {className || 'Class'} · Order of Merit · {termName || ''}</Text>

        <View style={styles.tableHeader}>
          <Text style={styles.cellRank}>#</Text>
          <Text style={styles.cellName}>Name</Text>
          <Text style={styles.cellAgg}>Aggregate</Text>
          <Text style={styles.cellOutOf}>Out Of</Text>
        </View>

        {rows.map((r: any, idx: number) => (
          <View key={r.student_id || idx} style={styles.row}>
            <Text style={styles.cellRank}>{idx + 1}</Text>
            <Text style={styles.cellName}>{r.name || r.student_name || '—'}</Text>
            <Text style={styles.cellAgg}>{(r.aggregate ?? r.total_score)?.toString()}</Text>
            <Text style={styles.cellOutOf}>{r.out_of ?? ''}</Text>
          </View>
        ))}
      </Page>
    </Document>
  )
}
