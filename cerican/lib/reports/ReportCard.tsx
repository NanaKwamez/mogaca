import React from 'react'
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({ family: 'Inter', src: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap' })

const styles = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 11, padding: 24, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 600 },
  studentInfo: { marginBottom: 12 },
  table: { width: '100%', borderWidth: 1, borderColor: '#ddd', marginBottom: 12 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 6 },
  cell: { flex: 1, paddingHorizontal: 6 },
  footer: { marginTop: 12, fontSize: 10 }
})

export function ReportCardPDF({ student, report, scores, settings }: any) {
  // student: { first_name, surname, ... }
  // report: student_report record
  // scores: array of { subject_id, class_score, exam_score, total_score, grade }
  // settings: resolved settings snapshot

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Report Card</Text>
            <Text>{student?.first_name} {student?.surname}</Text>
            <Text>Class: {report?.class_id}</Text>
          </View>
          <View>
            <Text>Term: {report?.term_id}</Text>
            <Text>Status: {report?.status}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, { backgroundColor: '#f6f6f6' }]}>
            <Text style={[styles.cell, { flex: 3 }]}>Subject</Text>
            {settings.show_raw_class_score && <Text style={styles.cell}>Class</Text>}
            {settings.show_raw_exam_score && <Text style={styles.cell}>Exam</Text>}
            {settings.show_raw_score && <Text style={styles.cell}>Total</Text>}
            {settings.show_grades_column && <Text style={styles.cell}>Grade</Text>}
          </View>

          {scores?.map((s: any) => (
            <View style={styles.row} key={s.subject_id}>
              <Text style={[styles.cell, { flex: 3 }]}>{s.subject_name ?? s.subject_id}</Text>
              {settings.show_raw_class_score && <Text style={styles.cell}>{s.class_score ?? '-'}</Text>}
              {settings.show_raw_exam_score && <Text style={styles.cell}>{s.exam_score ?? '-'}</Text>}
              {settings.show_raw_score && <Text style={styles.cell}>{s.total_score ?? '-'}</Text>}
              {settings.show_grades_column && <Text style={styles.cell}>{s.grade ?? '-'}</Text>}
            </View>
          ))}
        </View>

        <View>
          <Text style={{ fontWeight: 600 }}>Headteacher's Remark</Text>
          <Text>{report?.headteacher_remark_id_text ?? ''}</Text>
        </View>

        <View style={styles.footer}>
          <Text>Generated: {report?.generated_at ?? ''}</Text>
          <Text>School signature: ____________________</Text>
        </View>
      </Page>
    </Document>
  )
}

export default ReportCardPDF
