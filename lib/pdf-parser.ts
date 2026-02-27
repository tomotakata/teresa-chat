export async function parsePdf(buffer: Buffer): Promise<string> {
  // Use the internal lib directly to avoid pdf-parse's test file loading on import
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buffer: Buffer) => Promise<{ text: string }>
  const data = await pdfParse(buffer)
  return data.text
}
