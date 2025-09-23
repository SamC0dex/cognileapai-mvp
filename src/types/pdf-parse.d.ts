declare module 'pdf-parse' {
  function pdf(buffer: Buffer): Promise<{
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: Record<string, unknown> | null
    text: string
    version: string
  }>
  
  export = pdf
}