import type {
  CertificateSnapshotJsonV1,
  CertificateTemplateDetailDto,
  CertificateTemplateLayoutV1,
} from '@school/shared';
import {
  normalizeCertificateTemplatePage,
  CERTIFICATE_LABEL_DEFAULTS,
  CERTIFICATE_LABEL_DEFAULTS_NIKUD,
} from '@school/shared';

/** Strip Hebrew nikud diacritics for comparison purposes. */
function stripNikud(text: string): string {
  return text.replace(/[ְ-ֿׁׂ]/g, '').trim();
}

/**
 * Build a reverse lookup: stripped default label text → the override value.
 * This allows standard lbl: keys (gradesSection, homeroomSig, etc.) to match
 * against block content in custom templates.
 */
function buildStandardLabelTextMap(labelOverrides: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, override] of Object.entries(labelOverrides)) {
    if (key.startsWith('block.') || !override.trim()) continue;
    const def = CERTIFICATE_LABEL_DEFAULTS[key];
    const defNikud = CERTIFICATE_LABEL_DEFAULTS_NIKUD[key];
    if (def) map.set(stripNikud(def), override);
    if (defNikud && stripNikud(defNikud) !== stripNikud(def ?? '')) {
      map.set(stripNikud(defNikud), override);
    }
  }
  return map;
}

function applyLabelOverridesToLayout(
  layout: CertificateTemplateLayoutV1,
  labelOverrides: Record<string, string>,
): CertificateTemplateLayoutV1 {
  if (Object.keys(labelOverrides).length === 0) return layout;

  const byText = buildStandardLabelTextMap(labelOverrides);

  const applyText = (text: string | null | undefined): string => {
    if (!text) return text ?? '';
    return byText.get(stripNikud(text)) ?? text;
  };

  return {
    ...layout,
    blocks: layout.blocks.map((block) => {
      if (block.type === 'static_text') {
        // block.xxx override takes priority over content-based match
        const blockOverride = labelOverrides[`block.${block.id}`];
        if (blockOverride) return { ...block, props: { ...block.props, text: blockOverride } };
        const replaced = applyText(block.props.text);
        if (replaced !== block.props.text) return { ...block, props: { ...block.props, text: replaced } };
      }
      if (block.type === 'grades_table') {
        const h = block.props.headerLabels;
        const subject = applyText(h.subject);
        const grade = applyText(h.grade);
        const comment = applyText(h.comment);
        if (subject !== h.subject || grade !== h.grade || comment !== h.comment) {
          return { ...block, props: { ...block.props, headerLabels: { subject, grade, comment } } };
        }
      }
      if (block.type === 'evaluation') {
        const replaced = applyText(block.props.title);
        if (replaced !== block.props.title) return { ...block, props: { ...block.props, title: replaced } };
      }
      if (block.type === 'attendance_field') {
        const replaced = applyText(block.props.label);
        if (replaced !== block.props.label) return { ...block, props: { ...block.props, label: replaced } };
      }
      if (block.type === 'signatures') {
        const l = block.props.labels;
        const homeroom = applyText(l.homeroom);
        const principal = applyText(l.principal);
        const parent = applyText(l.parent);
        if (homeroom !== l.homeroom || principal !== l.principal || parent !== l.parent) {
          return { ...block, props: { ...block.props, labels: { homeroom, principal, parent } } };
        }
      }
      if (block.type === 'signature_field') {
        const replaced = applyText(block.props.label);
        if (replaced !== block.props.label) return { ...block, props: { ...block.props, label: replaced } };
      }
      return block;
    }),
  };
}
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
  const labelOverrides = (snapshot.certificatePrefs?.labelOverrides ?? {}) as Record<string, string>;
  const baseLayout = applyLabelOverridesToLayout(template.layoutJson, labelOverrides);
  const layoutJson = snapshot.certificatePrefs?.nikud && nikudFn
    ? await nikudifyLayout(baseLayout, nikudFn)
    : baseLayout;
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
  const labelOverrides = (snapshot.certificatePrefs?.labelOverrides ?? {}) as Record<string, string>;
  const baseLayout = applyLabelOverridesToLayout(template.layoutJson, labelOverrides);
  const layoutJson = snapshot.certificatePrefs?.nikud && nikudFn
    ? await nikudifyLayout(baseLayout, nikudFn)
    : baseLayout;
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
