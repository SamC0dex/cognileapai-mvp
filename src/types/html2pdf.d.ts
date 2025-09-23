declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[]
    filename?: string
    image?: {
      type?: string
      quality?: number
    }
    html2canvas?: {
      scale?: number
      backgroundColor?: string
      useCORS?: boolean
    }
    jsPDF?: {
      unit?: string
      format?: string
      orientation?: string
      compressPDF?: boolean
    }
    pagebreak?: {
      mode?: string | string[]
      before?: string | string[]
      after?: string | string[]
      avoid?: string | string[]
    }
    enableLinks?: boolean
  }

  interface Html2PdfWorker {
    from(element: Element | string): Html2PdfWorker
    to(target: string): Html2PdfWorker
    set(options: Html2PdfOptions): Html2PdfWorker
    save(filename?: string): Promise<void>
    toPdf(): Html2PdfWorker
    output(type?: 'pdf' | 'blob' | 'dataurlnewwindow' | 'dataurl' | 'datauristring' | 'arraybuffer', options?: Record<string, unknown>): Promise<Blob | string | ArrayBuffer | HTMLCanvasElement>
    toCanvas(): Html2PdfWorker
    toImg(): Html2PdfWorker
    then(onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown): Html2PdfWorker
    catch(onRejected?: (reason: unknown) => unknown): Html2PdfWorker
  }

  interface Html2Pdf {
    (): Html2PdfWorker
    (element: Element, options?: Html2PdfOptions): Promise<void>
    Worker: new () => Html2PdfWorker
  }

  const html2pdf: Html2Pdf
  export default html2pdf
}