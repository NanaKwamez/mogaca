export default async function Page({ params }: { params: { reportId: string } }) {
  const { reportId } = params
  return (
    <main className="p-4">
      <h1 className="text-xl font-semibold">Report Preview</h1>
      <iframe src={`/api/reports/pdf/${reportId}`} style={{ width: '100%', height: '80vh', border: '1px solid #ddd' }} />
    </main>
  )
}
