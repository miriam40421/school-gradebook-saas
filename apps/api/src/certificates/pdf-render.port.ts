export const PDF_RENDER_SERVICE = Symbol('PDF_RENDER_SERVICE');

export interface PdfRenderService {
  renderCertificateHtml(snapshot: unknown): Promise<Buffer>;
  renderCertificateHtmlString(snapshot: unknown): Promise<string>;
  renderHtmlToPdf(
    html: string,
    orientation: 'portrait' | 'landscape',
  ): Promise<Buffer>;
  /** Render many HTML strings to PDFs using a single Chromium launch. */
  renderManyHtmlToPdf(
    items: Array<{ html: string; orientation?: 'portrait' | 'landscape' }>,
  ): Promise<Buffer[]>;
}
