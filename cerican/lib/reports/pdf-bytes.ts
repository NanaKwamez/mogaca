import { Readable } from 'stream'

export async function pdfOutputToBytes(output: unknown): Promise<Uint8Array> {
  if (output instanceof Uint8Array) return output
  if (Buffer.isBuffer(output)) return new Uint8Array(output)

  if (output instanceof Readable || (output && typeof (output as any).on === 'function')) {
    const chunks: Buffer[] = []
    for await (const chunk of output as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return new Uint8Array(Buffer.concat(chunks))
  }

  throw new Error('Unsupported PDF output type')
}
