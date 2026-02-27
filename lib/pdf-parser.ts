export async function parsePdf(buffer: Buffer): Promise<string> {
  const pdfParse = await import('pdf-parse')
  const module = ('default' in pdfParse ? pdfParse.default : pdfParse) as (buffer: Buffer) => Promise<{ text: string }>
  const data = await module(buffer)
  return data.text
}
