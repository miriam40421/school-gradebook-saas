import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import type { CertificateSnapshotJsonV1 } from '@school/shared';
import {
  certificateFillView,
  normalizeCertificatePrefs,
} from '@school/shared';
import { PDF_RENDER_SERVICE, type PdfRenderService } from './pdf-render.port';

@Injectable()
export class MockPdfRenderService implements PdfRenderService {
  async renderCertificateHtml(_snapshot: unknown): Promise<Buffer> {
    return Buffer.from('%PDF-1.4 mock certificate\n');
  }

  async renderCertificateHtmlString(_snapshot: unknown): Promise<string> {
    return '<html><body>mock</body></html>';
  }

  async renderHtmlToPdf(_html: string, _orientation: 'portrait' | 'landscape'): Promise<Buffer> {
    return Buffer.from('%PDF-1.4 mock layout certificate\n');
  }
}

const CHROMIUM_EXEC =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  ['/snap/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome']
    .find((p) => { try { return fs.existsSync(p); } catch { return false; } });

@Injectable()
export class PlaywrightPdfRenderService implements PdfRenderService {
  private compiledTemplate: Handlebars.TemplateDelegate | null = null;

  private loadTemplate(): Handlebars.TemplateDelegate {
    if (this.compiledTemplate) return this.compiledTemplate;
    const templatePath = path.join(
      __dirname,
      'templates',
      'default-rtl.hbs',
    );
    const source = fs.readFileSync(templatePath, 'utf8');
    this.compiledTemplate = Handlebars.compile(source);
    return this.compiledTemplate;
  }

  private buildSnapshotData(snapshot: unknown): { html: string } {
    const raw = snapshot as CertificateSnapshotJsonV1;
    const prefs = normalizeCertificatePrefs(raw.certificatePrefs ?? {});
    const legacy = raw as CertificateSnapshotJsonV1 & {
      homeroomComment?: string | null;
    };
    const data: CertificateSnapshotJsonV1 = {
      ...raw,
      certificatePrefs: prefs,
      fill: raw.fill ?? certificateFillView(prefs),
      evaluation: raw.evaluation ?? legacy.homeroomComment ?? null,
    };
    try {
      return { html: this.loadTemplate()(data) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Template render failed';
      throw new Error(`Certificate template error: ${msg}`);
    }
  }

  async renderCertificateHtmlString(snapshot: unknown): Promise<string> {
    return this.buildSnapshotData(snapshot).html;
  }

  async renderCertificateHtml(snapshot: unknown): Promise<Buffer> {
    const { html } = this.buildSnapshotData(snapshot);
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: true,
        ...(CHROMIUM_EXEC ? { executablePath: CHROMIUM_EXEC } : {}),
      });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle' });
        const pdf = await page.pdf({ format: 'A4', printBackground: true });
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Executable doesn') || msg.includes('browserType.launch')) {
        throw new Error(
          'Playwright Chromium not installed. Run: cd apps/api && npx playwright install chromium',
        );
      }
      throw err;
    }
  }

  async renderHtmlToPdf(
    html: string,
    orientation: 'portrait' | 'landscape',
  ): Promise<Buffer> {
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: true,
        ...(CHROMIUM_EXEC ? { executablePath: CHROMIUM_EXEC } : {}),
      });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle' });
        const pdf = await page.pdf({
          format: 'A4',
          landscape: orientation === 'landscape',
          printBackground: true,
        });
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Executable doesn') || msg.includes('browserType.launch')) {
        throw new Error(
          'Playwright Chromium not installed. Run: cd apps/api && npx playwright install chromium',
        );
      }
      throw err;
    }
  }
}

function useMockPdf(): boolean {
  return process.env.NODE_ENV === 'test';
}

export const pdfRenderProvider = {
  provide: PDF_RENDER_SERVICE,
  useClass: useMockPdf() ? MockPdfRenderService : PlaywrightPdfRenderService,
};
