export const PDF_RENDER_SERVICE = Symbol('PDF_RENDER_SERVICE');

export interface PdfRenderService {
  renderCertificateHtml(snapshot: unknown): Promise<Buffer>;
  renderCertificateHtmlString(snapshot: unknown): Promise<string>;
  renderHtmlToPdf(
    html: string,
    orientation: 'portrait' | 'landscape',
  ): Promise<Buffer>;
}
