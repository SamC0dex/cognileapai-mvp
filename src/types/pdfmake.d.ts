/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Type declarations for pdfmake
 * Provides minimal type safety for PDF generation functionality
 */

declare module 'pdfmake/build/pdfmake' {
  export interface TDocumentDefinitions {
    content: any
    styles?: Record<string, any>
    defaultStyle?: Record<string, any>
    pageMargins?: [number, number, number, number]
    pageSize?: string | { width: number; height: number }
    [key: string]: any
  }

  export interface TCreatedPdf {
    download(filename?: string): void
    open(): void
    print(): void
    getBlob(callback: (blob: Blob) => void): void
    getBase64(callback: (base64: string) => void): void
  }

  export interface pdfMakeStatic {
    vfs: any
    createPdf(documentDefinitions: TDocumentDefinitions): TCreatedPdf
    fonts?: Record<string, any>
  }

  const pdfMake: pdfMakeStatic
  export default pdfMake
}

declare module 'pdfmake/build/vfs_fonts' {
  export interface VfsFonts {
    pdfMake: {
      vfs: Record<string, any>
    }
  }

  const vfs: VfsFonts
  export default vfs
}
