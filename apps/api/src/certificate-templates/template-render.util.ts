import type {
  CertificateSnapshotJsonV1,
  CertificateTemplateDetailDto,
  CertificateTemplateLayoutV1,
} from '@school/shared';
import { normalizeCertificateTemplatePage } from '@school/shared';
import { renderLayoutHtml, nikudifyLayout } from '@school/certificate-layout';
import type { StoragePort } from '../storage/storage.port';
import type { PdfRenderService } from '../certificates/pdf-render.port';

function mimeForStorageKey(key: string): string {
  if (key.endsWith('.svg')) return 'image/svg+xml';
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg';
  if (key.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

async function resolveTemplateAssetUrls(
  layout: CertificateTemplateLayoutV1,
  storage: StoragePort,
  fallbackLogoKey?: string | null,
): Promise<Record<string, string>> {
  const keys = new Set<string>();
  const page = normalizeCertificateTemplatePage(layout.page);
  if (page.backgroundImageStorageKey) {
    keys.add(page.backgroundImageStorageKey);
  }
  for (const block of layout.blocks) {
    if (block.type === 'logo' && block.props.storageKey) {
      keys.add(block.props.storageKey);
    }
  }
  if (![...keys].some((k) => k.includes('/logo.')) && fallbackLogoKey) {
    keys.add(fallbackLogoKey);
  }
  const urls: Record<string, string> = {};
  for (const key of keys) {
    try {
      const buf = await storage.getObject(key);
      const mime = mimeForStorageKey(key);
      urls[key] = `data:${mime};base64,${buf.toString('base64')}`;
    } catch {
      // Skip missing assets.
    }
  }
  return urls;
}

export async function renderTemplateHtmlString(
  template: CertificateTemplateDetailDto,
  snapshot: CertificateSnapshotJsonV1,
  storage: StoragePort,
  nikudFn?: (text: string) => Promise<string>,
): Promise<string> {
  const layoutJson = snapshot.certificatePrefs?.nikud && nikudFn
    ? await nikudifyLayout(template.layoutJson, nikudFn)
    : template.layoutJson;
  const assetUrls = await resolveTemplateAssetUrls(
    layoutJson,
    storage,
    template.logoStorageKey,
  );
  return renderLayoutHtml({ layout: layoutJson, snapshot, logoUrls: assetUrls, assetUrls });
}

export async function renderTemplatePdf(
  template: CertificateTemplateDetailDto,
  snapshot: CertificateSnapshotJsonV1,
  storage: StoragePort,
  pdfRender: PdfRenderService,
  nikudFn?: (text: string) => Promise<string>,
): Promise<Buffer> {
  const layoutJson = snapshot.certificatePrefs?.nikud && nikudFn
    ? await nikudifyLayout(template.layoutJson, nikudFn)
    : template.layoutJson;
  const assetUrls = await resolveTemplateAssetUrls(
    layoutJson,
    storage,
    template.logoStorageKey,
  );
  const html = renderLayoutHtml({
    layout: layoutJson,
    snapshot,
    logoUrls: assetUrls,
    assetUrls,
  });
  return pdfRender.renderHtmlToPdf(html, template.orientation);
}
