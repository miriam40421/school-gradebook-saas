import type {
  CertificateSnapshotJsonV1,
  CertificateTemplateLayoutV1,
  LayoutBlock,
  LayoutBlockType,
} from '@school/shared';
import {
  A4_DIMENSIONS_MM,
  attendanceFieldEnabled,
  resolveAttendanceFieldValue,
  signatureTypeEnabled,
  certificateFieldHandwritten,
  certificateFieldLabel,
  headerMetaFieldVisible,
  HEADER_META_ROW_FIELD_KEYS,
  normalizeCertificateTemplatePage,
  DEFAULT_GRADES_TABLE_HEADER_LABELS,
  DEFAULT_GRADES_TABLE_HEADER_LABELS_NIKUD,
  DEFAULT_ATTENDANCE_FIELD_LABELS_NIKUD,
  type CertificateTemplatePageV1,
} from '@school/shared';
import { coalesceHeaderMetaRow } from './coalesce-header-meta';
import { ensureProfileNameBlock, normalizeEvaluationCenter, normalizeProfileNamePosition } from './ensure-profile-name';
import {
  evaluationHandwrittenHeightMm,
  handwrittenLinesHtml,
  handwrittenUnderlineSpan,
} from './handwritten-render';
import { EVALUATION_HANDWRITTEN_LINE_COUNT } from '@school/shared';
import { normalizeLayoutForRender } from './layout-normalize';

export type RenderLayoutOptions = {
  layout: CertificateTemplateLayoutV1;
  snapshot: CertificateSnapshotJsonV1;
  logoUrls?: Record<string, string>;
  /** storageKey → data URL (page background and other template assets) */
  assetUrls?: Record<string, string>;
};

function renderPageBackground(
  page: CertificateTemplatePageV1,
  urls: Record<string, string>,
): string {
  const normalized = normalizeCertificateTemplatePage(page);
  const key = normalized.backgroundImageStorageKey;
  if (!key || normalized.backgroundImageMode === 'none') return '';
  const url = urls[key];
  if (!url) return '';
  const modeClass = normalized.backgroundImageMode === 'corner' ? 'corner' : 'full';
  const fit = normalized.backgroundImageFit;
  return `<div class="page-background ${modeClass}"><img src="${escapeHtml(url)}" alt="" style="object-fit:${fit}" /></div>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Preserve line breaks and wrap long lines in certificate text blocks. */
function formatMultilineHtml(text: string): string {
  return escapeHtml(text).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
}

function blankLine(chars = 24): string {
  return '—'.repeat(Math.max(8, Math.floor(chars / 2)));
}

function sectionBorderClass(
  block: LayoutBlock,
  prefs: CertificateSnapshotJsonV1['certificatePrefs'],
): string {
  if (block.type === 'evaluation' && prefs.evaluationBorder) return ' block-bordered';
  if (
    (block.type === 'attendance' || block.type === 'attendance_field') &&
    prefs.attendanceFieldBorder
  ) {
    return ' block-bordered';
  }
  if (
    (block.type === 'signature_field' || block.type === 'signatures') &&
    prefs.signatureFieldBorder
  ) {
    return ' block-bordered';
  }
  if (block.type === 'date' && prefs.dateBorder) return ' block-bordered';
  return '';
}

function groupBorderMarginMm(prefs: CertificateSnapshotJsonV1['certificatePrefs']): number {
  const nested =
    (prefs.attendanceBorder && prefs.attendanceFieldBorder) ||
    (prefs.signaturesBorder && prefs.signatureFieldBorder) ||
    (prefs.signaturesBorder && prefs.dateBorder);
  return nested ? 4 : 2;
}

type BoxMm = { xMm: number; yMm: number; wMm: number; hMm: number };

function unionBoxes(boxes: BoxMm[]): BoxMm | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((b) => b.xMm));
  const top = Math.min(...boxes.map((b) => b.yMm));
  const right = Math.max(...boxes.map((b) => b.xMm + b.wMm));
  const bottom = Math.max(...boxes.map((b) => b.yMm + b.hMm));
  return { xMm: left, yMm: top, wMm: right - left, hMm: bottom - top };
}

function expandBox(box: BoxMm, marginMm = 2): BoxMm {
  return {
    xMm: box.xMm - marginMm,
    yMm: box.yMm - marginMm,
    wMm: box.wMm + marginMm * 2,
    hMm: box.hMm + marginMm * 2,
  };
}

function attendanceBlockVisible(
  block: LayoutBlock,
  prefs: CertificateSnapshotJsonV1['certificatePrefs'],
): boolean {
  if (block.type === 'attendance_field') {
    return attendanceFieldEnabled(prefs, block.props.fieldKey);
  }
  if (block.type === 'attendance') {
    return Boolean(
      prefs.absences || prefs.lateness || prefs.hourAbsences || prefs.hourLateness,
    );
  }
  return false;
}

function footerBlockVisible(
  block: LayoutBlock,
  prefs: CertificateSnapshotJsonV1['certificatePrefs'],
): boolean {
  if (block.type === 'signature_field') {
    return Boolean(prefs.signatures) && signatureTypeEnabled(prefs, block.props.signatureKey);
  }
  if (block.type === 'date') {
    return prefs.dateOnCertificate !== false;
  }
  if (block.type === 'signatures') {
    return Boolean(prefs.signatures);
  }
  return false;
}

function renderSectionGroupBorders(
  layout: CertificateTemplateLayoutV1,
  snapshot: CertificateSnapshotJsonV1,
  padding: CertificateTemplateLayoutV1['page']['paddingMm'],
): string {
  const prefs = snapshot.certificatePrefs;
  const parts: string[] = [];

  if (prefs.attendanceBorder) {
    const boxes = layout.blocks
      .filter((b) => attendanceBlockVisible(b, prefs))
      .map((b) => b.box);
    const union = unionBoxes(boxes);
    if (union) {
      const box = expandBox(union, groupBorderMarginMm(prefs));
      parts.push(
        `<div class="section-group-border" style="${boxCss(box, padding)}"></div>`,
      );
    }
  }

  if (prefs.signaturesBorder) {
    const boxes = layout.blocks
      .filter((b) => footerBlockVisible(b, prefs))
      .map((b) => b.box);
    const union = unionBoxes(boxes);
    if (union) {
      const box = expandBox(union, groupBorderMarginMm(prefs));
      parts.push(
        `<div class="section-group-border" style="${boxCss(box, padding)}"></div>`,
      );
    }
  }

  return parts.join('\n');
}

function blockStyleCss(style: LayoutBlock['style'], blockType?: LayoutBlockType): string {
  const allowWrap =
    blockType === 'evaluation' ||
    blockType === 'field' ||
    blockType === 'date' ||
    blockType === 'header_meta_row';
  const textAlign = blockType === 'evaluation' ? 'center' : style.textAlign;
  return [
    `font-family: ${escapeHtml(style.fontFamily)}, Arial, sans-serif`,
    `font-size: ${style.fontSizePt}pt`,
    `font-weight: ${style.fontWeight}`,
    `color: ${style.color}`,
    `text-align: ${textAlign}`,
    style.backgroundColor !== 'transparent'
      ? `background-color: ${style.backgroundColor}`
      : '',
    allowWrap ? 'overflow: visible' : 'overflow: hidden',
    'box-sizing: border-box',
  ]
    .filter(Boolean)
    .join('; ');
}

function renderProfileNameField(snapshot: CertificateSnapshotJsonV1): string {
  if (!snapshot.certificatePrefs.showProfileNameOnCertificate) return '';
  const name = snapshot.certificateProfileName?.trim();
  if (!name) return '';
  return `<div class="profile-name-field">${escapeHtml(name)}</div>`;
}

const FIELD_KEY_TO_LABEL_OVERRIDE_KEY: Record<string, string> = {
  studentName: 'studentNameLabel',
  className: 'classLabel',
  termName: 'termLabel',
  cohort: 'cohortLabel',
};

function resolveFieldLabel(fieldKey: string, snapshot: CertificateSnapshotJsonV1): string | null {
  const overrideKey = FIELD_KEY_TO_LABEL_OVERRIDE_KEY[fieldKey];
  if (overrideKey) {
    const overrides = snapshot.certificatePrefs?.labelOverrides;
    if (overrides && typeof overrides === 'object') {
      const override = (overrides as Record<string, string>)[overrideKey];
      if (override) return override.replace(/:$/, '');
    }
  }
  return certificateFieldLabel(fieldKey, Boolean(snapshot.certificatePrefs?.nikud));
}

function renderMetaField(
  fieldKey: string,
  snapshot: CertificateSnapshotJsonV1,
  handwritten: boolean,
): string {
  if (fieldKey === 'schoolName') return '';
  if (fieldKey === 'profileName') return renderProfileNameField(snapshot);
  if (!headerMetaFieldVisible(snapshot.certificatePrefs, fieldKey)) return '';

  const label = resolveFieldLabel(fieldKey, snapshot);
  if (handwritten && label) {
    return `<div class="meta-field handwritten"><span class="field-label">${escapeHtml(label)}:</span><span class="field-line"></span></div>`;
  }

  const value = resolveField(snapshot, fieldKey).trim();
  if (!value) return '';
  if (label) {
    return `<div class="meta-field computer"><span class="field-label">${escapeHtml(label)}:</span> <span class="field-value">${escapeHtml(value)}</span></div>`;
  }
  return `<div class="meta-field computer"><span class="field-value">${escapeHtml(value)}</span></div>`;
}

function renderFooterDate(snapshot: CertificateSnapshotJsonV1): string {
  const nikud = Boolean(snapshot.certificatePrefs?.nikud);
  const overrideDateLabel = (snapshot.certificatePrefs?.labelOverrides as Record<string, string> | undefined)?.['date'];
  const label = overrideDateLabel || certificateFieldLabel('date', nikud) || (nikud ? 'תַּאֲרִיךְ' : 'תאריך');
  const content = snapshot.fill.dateHandwritten
    ? ''
    : escapeHtml(snapshot.displayDate?.trim() ?? '');
  return `<div class="sig-field"><span class="sig-label">${escapeHtml(label)}</span><span class="sig-line">${content}</span></div>`;
}

function renderMetaSegment(
  fieldKey: string,
  snapshot: CertificateSnapshotJsonV1,
  handwritten: boolean,
): string {
  if (!headerMetaFieldVisible(snapshot.certificatePrefs, fieldKey)) return '';
  const label = resolveFieldLabel(fieldKey, snapshot);
  if (!label) return '';
  if (handwritten) {
    return `<span class="meta-seg ${fieldKey} handwritten"><span class="field-label">${escapeHtml(label)}:</span><span class="field-line"></span></span>`;
  }
  const value = resolveField(snapshot, fieldKey).trim() || '—';
  return `<span class="meta-seg ${fieldKey} computer"><span class="field-label">${escapeHtml(label)}:</span><span class="field-value">${escapeHtml(value)}</span></span>`;
}

function renderHeaderMetaRow(snapshot: CertificateSnapshotJsonV1): string {
  const segments = HEADER_META_ROW_FIELD_KEYS.map((fieldKey) =>
    renderMetaSegment(
      fieldKey,
      snapshot,
      certificateFieldHandwritten(snapshot.fill, fieldKey),
    ),
  )
    .filter(Boolean)
    .join('');
  if (!segments) return '';
  return `<div class="meta-row" dir="rtl">${segments}</div>`;
}

function boxCss(box: LayoutBlock['box'], padding: CertificateTemplateLayoutV1['page']['paddingMm']): string {
  return [
    'position: absolute',
    `left: ${padding.left + box.xMm}mm`,
    `top: ${padding.top + box.yMm}mm`,
    `width: ${box.wMm}mm`,
    `height: ${box.hMm}mm`,
  ].join('; ');
}

function resolveField(snapshot: CertificateSnapshotJsonV1, fieldKey: string): string {
  switch (fieldKey) {
    case 'studentName':
      return snapshot.student.fullName;
    case 'className':
      return snapshot.class.name;
    case 'termName':
      return snapshot.term.name;
    case 'schoolName':
      return snapshot.school.name;
    case 'classYearHebrew':
      return snapshot.class.yearHebrew ?? snapshot.class.cohort ?? '';
    case 'cohort':
      return snapshot.class.cohort ?? snapshot.class.yearHebrew ?? '';
    case 'profileName':
      return snapshot.certificateProfileName?.trim() ?? '';
    default:
      return '';
  }
}

function renderGradesTable(
  block: LayoutBlock & { type: 'grades_table' },
  snapshot: CertificateSnapshotJsonV1,
): string {
  const fill = snapshot.fill;
  const prefs = snapshot.certificatePrefs;
  const filterCategoryId = block.props.categoryId?.trim() || null;
  const showCategoryTitle =
    block.props.showCategoryTitle ?? (filterCategoryId === null);
  const showComment = snapshot.showAnyGradeComment ?? false;
  const showSubRows =
    block.props.showSubCategoryRows ??
    prefs.showSubCategoriesOnCertificate !== false;
  const nikudLabels = snapshot.certificatePrefs?.nikud ? DEFAULT_GRADES_TABLE_HEADER_LABELS_NIKUD : DEFAULT_GRADES_TABLE_HEADER_LABELS;
  const labels = block.props.headerLabels ?? nikudLabels;
  const rows: string[] = [];

  if (block.props.showHeader) {
    rows.push(
      `<tr><th>${escapeHtml(labels.subject)}</th><th>${escapeHtml(labels.grade)}</th>${
        showComment ? `<th>${escapeHtml(labels.comment)}</th>` : ''
      }</tr>`,
    );
  }

  const categories = filterCategoryId
    ? snapshot.subjectCategories.filter((c) => c.categoryId === filterCategoryId)
    : snapshot.subjectCategories;

  const categoryHeading =
    filterCategoryId && categories[0]?.categoryLabel
      ? categories[0].categoryLabel
      : null;

  for (const cat of categories) {
    if (!cat.subjects.length && !cat.subCategories?.length) continue;
    if (showCategoryTitle && !categoryHeading) {
      rows.push(
        `<tr class="cat"><td colspan="${showComment ? 3 : 2}"><strong>${escapeHtml(cat.categoryLabel)}</strong></td></tr>`,
      );
    }
    const renderSubject = (s: (typeof cat.subjects)[0]) => {
      const grade = fill.gradesHandwritten
        ? handwrittenUnderlineSpan('handwritten-underline handwritten-underline-wide')
        : escapeHtml(s.value ?? '—');
      const comment =
        showComment && s.showComment
          ? fill.gradeCommentsHandwritten
            ? handwrittenUnderlineSpan('handwritten-underline handwritten-underline-wide')
            : formatMultilineHtml(s.comment ?? '')
          : '';
      rows.push(
        `<tr><td>${escapeHtml(s.subjectName)}</td><td>${grade}</td>${
          showComment ? `<td>${comment}</td>` : ''
        }</tr>`,
      );
    };
    for (const s of cat.subjects) renderSubject(s);
    for (const sub of cat.subCategories ?? []) {
      if (showSubRows && sub.subCategoryLabel) {
        rows.push(
          `<tr class="sub"><td colspan="${showComment ? 3 : 2}">${escapeHtml(sub.subCategoryLabel)}</td></tr>`,
        );
      }
      for (const s of sub.subjects) renderSubject(s);
    }
  }

  if (rows.length === 0 && filterCategoryId) {
    const heading = categoryHeading
      ? `<div class="grades-cat-heading">${escapeHtml(categoryHeading)}</div>`
      : '';
    return `<div class="grades-section">${heading}<table class="grades" dir="rtl"><tr><td colspan="2" class="grades-empty">—</td></tr></table></div>`;
  }

  const headingHtml = categoryHeading
    ? `<div class="grades-cat-heading">${escapeHtml(categoryHeading)}</div>`
    : '';
  return `<div class="grades-section">${headingHtml}<table class="grades" dir="rtl">${rows.join('')}</table></div>`;
}

function renderAttendanceField(
  block: LayoutBlock & { type: 'attendance_field' },
  snapshot: CertificateSnapshotJsonV1,
): string {
  const prefs = snapshot.certificatePrefs;
  if (!attendanceFieldEnabled(prefs, block.props.fieldKey)) return '';
  const fill = snapshot.fill;
  const raw = resolveAttendanceFieldValue(block.props.fieldKey, snapshot.attendance);
  const value = fill.attendanceHandwritten
    ? handwrittenUnderlineSpan('att-underline')
    : escapeHtml(raw ?? '—');
  const label = escapeHtml(block.props.label);
  return `<div class="att-field"><span class="att-label">${label}:</span> <span class="att-value">${value}</span></div>`;
}

function renderAttendance(
  block: LayoutBlock & { type: 'attendance' },
  snapshot: CertificateSnapshotJsonV1,
): string {
  const prefs = snapshot.certificatePrefs;
  const fill = snapshot.fill;
  const att = snapshot.attendance ?? {};
  const nikud = Boolean(prefs?.nikud);
  const attLabels = nikud ? DEFAULT_ATTENDANCE_FIELD_LABELS_NIKUD : {
    absences: 'חיסורים',
    lateness: 'איחורים',
    hourAbsences: 'חיסורי שעות',
    hourLateness: 'איחורי שעות',
  };
  const lines: string[] = [];
  const val = (v: string | null | undefined) => {
    if (fill.attendanceHandwritten) return handwrittenUnderlineSpan('att-underline');
    return escapeHtml(v ?? '—');
  };

  if (prefs.absences) {
    lines.push(`<div class="att-row"><span class="att-label">${escapeHtml(attLabels.absences)}:</span> ${val(att.absences)}</div>`);
  }
  if (prefs.lateness) {
    lines.push(`<div class="att-row"><span class="att-label">${escapeHtml(attLabels.lateness)}:</span> ${val(att.lateness)}</div>`);
  }
  if (prefs.hourAbsences) {
    lines.push(`<div class="att-row"><span class="att-label">${escapeHtml(attLabels.hourAbsences)}:</span> ${val(att.hourAbsences)}</div>`);
  }
  if (prefs.hourLateness) {
    lines.push(`<div class="att-row"><span class="att-label">${escapeHtml(attLabels.hourLateness)}:</span> ${val(att.hourLateness)}</div>`);
  }

  if (lines.length === 0) return '';
  return `<div class="attendance-block">${lines.join('')}</div>`;
}

function renderEvaluation(
  block: LayoutBlock & { type: 'evaluation' },
  snapshot: CertificateSnapshotJsonV1,
): string {
  if (!snapshot.certificatePrefs.evaluation && !snapshot.certificatePrefs.homeroomComment) {
    return '';
  }
  const title = escapeHtml(block.props.title);
  const body = snapshot.fill.evaluationHandwritten
    ? handwrittenLinesHtml(EVALUATION_HANDWRITTEN_LINE_COUNT)
    : `<div class="evaluation-body">${evaluationBodyHtml(snapshot.evaluation ?? '')}</div>`;
  return `<div class="evaluation-block"><strong class="evaluation-title">${title}</strong>${body}</div>`;
}

function evaluationBodyHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '—';
  return formatMultilineHtml(normalized);
}

function renderSignatures(
  block: LayoutBlock & { type: 'signatures' },
  snapshot: CertificateSnapshotJsonV1,
): string {
  const prefs = snapshot.certificatePrefs;
  if (!prefs.signatures) return '';
  const labels = block.props.labels;
  const sigs = snapshot.signatures ?? {};
  const line = (type: 'homeroom' | 'principal' | 'parent', label: string, value: string | null | undefined) => {
    if (!signatureTypeEnabled(prefs, type)) return '';
    const content = snapshot.fill.signaturesHandwritten
      ? ''
      : escapeHtml(value ?? '');
    return `<div class="sig"><span class="sig-label">${escapeHtml(label)}</span><span class="sig-line">${content}</span></div>`;
  };
  const parts = [
    line('homeroom', labels.homeroom, sigs.homeroom),
    line('principal', labels.principal, sigs.principal),
    line('parent', labels.parent, sigs.parent),
  ];
  if (prefs.dateOnCertificate !== false) {
    parts.push(renderFooterDate(snapshot));
  }
  const inner = parts.filter(Boolean).join('');
  return inner ? `<div class="signatures-block" dir="rtl">${inner}</div>` : '';
}

function renderSignatureField(
  block: LayoutBlock & { type: 'signature_field' },
  snapshot: CertificateSnapshotJsonV1,
): string {
  const prefs = snapshot.certificatePrefs;
  if (!prefs.signatures || !signatureTypeEnabled(prefs, block.props.signatureKey)) return '';
  const sigs = snapshot.signatures ?? {};
  const value = sigs[block.props.signatureKey];
  const content = snapshot.fill.signaturesHandwritten
    ? ''
    : escapeHtml(value ?? '');
  return `<div class="sig-field"><span class="sig-label">${escapeHtml(block.props.label)}</span><span class="sig-line">${content}</span></div>`;
}

function renderDate(
  block: LayoutBlock & { type: 'date' },
  snapshot: CertificateSnapshotJsonV1,
): string {
  if (!snapshot.certificatePrefs.dateOnCertificate) return '';
  if (block.props.format !== 'hebrew') return '';
  return renderFooterDate(snapshot);
}

function renderBlock(
  block: LayoutBlock,
  snapshot: CertificateSnapshotJsonV1,
  logoUrls: Record<string, string>,
  padding: CertificateTemplateLayoutV1['page']['paddingMm'],
): string {
  const style = blockStyleCss(block.style, block.type);
  const box = boxCss(block.box, padding);
  const wrapBlock =
    block.type === 'evaluation' ||
    block.type === 'field' ||
    block.type === 'date' ||
    block.type === 'header_meta_row' ||
    block.type === 'signature_field' ||
    block.type === 'signatures' ||
    block.type === 'attendance_field' ||
    block.type === 'attendance';
  const blockClass = `block block-${block.type}${wrapBlock ? ' block-wrap' : ''}${sectionBorderClass(block, snapshot.certificatePrefs)}`;

  let inner = '';
  switch (block.type) {
    case 'static_text':
      inner = escapeHtml(block.props.text);
      break;
    case 'logo': {
      const key = block.props.storageKey;
      const url = key ? logoUrls[key] : '';
      if (url) {
        inner = `<img src="${escapeHtml(url)}" style="width:100%;height:100%;object-fit:${block.props.objectFit}" alt="" />`;
      }
      break;
    }
    case 'field':
      inner = renderMetaField(
        block.props.fieldKey,
        snapshot,
        certificateFieldHandwritten(snapshot.fill, block.props.fieldKey),
      );
      break;
    case 'header_meta_row':
      inner = renderHeaderMetaRow(snapshot);
      break;
    case 'grades_table':
      inner = renderGradesTable(block, snapshot);
      break;
    case 'attendance':
      inner = renderAttendance(block, snapshot);
      break;
    case 'attendance_field':
      inner = renderAttendanceField(block, snapshot);
      break;
    case 'evaluation':
      inner = renderEvaluation(block, snapshot);
      break;
    case 'signatures':
      inner = renderSignatures(block, snapshot);
      break;
    case 'signature_field':
      inner = renderSignatureField(block, snapshot);
      break;
    case 'date':
      inner = renderDate(block, snapshot);
      break;
  }

  if (!inner && (block.type === 'attendance_field' || block.type === 'header_meta_row')) return '';

  return `<div class="${blockClass}" style="${box};${style}">${inner}</div>`;
}

export function renderLayoutHtml(options: RenderLayoutOptions): string {
  const { layout: rawLayout, snapshot, logoUrls = {}, assetUrls = {} } = options;
  const imageUrls = { ...assetUrls, ...logoUrls };
  const layout = normalizeEvaluationCenter(
    normalizeLayoutForRender(
      normalizeProfileNamePosition(
        ensureProfileNameBlock(coalesceHeaderMetaRow(rawLayout), snapshot),
        snapshot,
      ),
      snapshot,
    ),
  );
  const page = normalizeCertificateTemplatePage(layout.page);
  const dims = A4_DIMENSIONS_MM[page.orientation];
  const padding = page.paddingMm;

  const blocksHtml = layout.blocks
    .map((b) => renderBlock(b, snapshot, imageUrls, padding))
    .join('\n');
  const groupBordersHtml = renderSectionGroupBorders(layout, snapshot, padding);

  const backgroundHtml = renderPageBackground(page, imageUrls);

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: ${dims.width}mm ${dims.height}mm; margin: 0; }
    * { margin: 0; padding: 0; }
    body {
      width: ${dims.width}mm;
      height: ${dims.height}mm;
      background: ${page.backgroundColor};
      position: relative;
      font-family: Arial, sans-serif;
      direction: rtl;
      overflow: hidden;
    }
    ${snapshot.certificatePrefs?.nikud ? `body { font-family: 'Noto Serif Hebrew', 'Noto Sans Hebrew', Arial, sans-serif; line-height: 2.2; }` : ''}
    .page-content {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .page-background {
      position: absolute;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }
    .page-background.full {
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .page-background.corner {
      top: 0;
      right: 0;
      width: 42%;
      height: 38%;
      max-width: 125mm;
      max-height: 95mm;
    }
    .page-background img {
      width: 100%;
      height: 100%;
      display: block;
    }
    .page-blocks {
      position: relative;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    table.grades {
      width: 100%;
      border-collapse: collapse;
      font-size: inherit;
    }
    .grades-section { width: 100%; }
    .grades-cat-heading {
      font-weight: 700;
      font-size: 1.08em;
      text-align: center;
      padding: 5px 10px;
      margin-bottom: 0;
      background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
      border: 1px solid #94a3b8;
      border-bottom: none;
      border-radius: 6px 6px 0 0;
      color: #0f172a;
      letter-spacing: 0.03em;
    }
    .grades-section table.grades {
      border-radius: 0 0 6px 6px;
      overflow: hidden;
    }
    .grades-section:has(.grades-cat-heading) table.grades {
      border-top: none;
    }
    .grades-section:not(:has(.grades-cat-heading)) table.grades {
      border-radius: 6px;
    }
    table.grades th, table.grades td {
      border: 1px solid #cbd5e1;
      padding: 2px 4px;
      text-align: right;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: pre-wrap;
    }
    table.grades th { background: #f1f5f9; }
    table.grades tr.cat td {
      background: #e2e8f0;
      font-weight: 700;
      text-align: center;
    }
    table.grades tr.sub td {
      background: #f8fafc;
      font-weight: 600;
      font-size: 0.95em;
    }
    .grades-empty { color: #94a3b8; font-style: italic; text-align: center; }
    .attendance-block {
      width: 100%;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 6px;
      direction: rtl;
    }
    .att-row { flex: 1; min-width: 0; white-space: nowrap; }
    .att-field {
      width: 100%;
      white-space: nowrap;
      display: flex;
      align-items: flex-end;
      gap: 4px;
    }
    .att-label { font-weight: 600; }
    .att-value { font-weight: normal; }
    .att-underline,
    .handwritten-underline {
      display: inline-block;
      border-bottom: 1px solid #334155;
      min-height: 1.25em;
      vertical-align: bottom;
      box-sizing: border-box;
    }
    .att-underline {
      min-width: 4.5em;
      flex: 1 1 auto;
    }
    .handwritten-underline-wide {
      min-width: 3.5em;
      width: 100%;
    }
    .handwritten-lines {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.55em;
      margin-top: 4px;
      box-sizing: border-box;
    }
    .handwritten-line {
      width: 100%;
      border-bottom: 1px solid #334155;
      min-height: 1.35em;
    }
    .block-bordered {
      outline: 1px solid #64748b;
      outline-offset: 2px;
      border-radius: 4px;
      box-sizing: border-box;
    }
    .meta-seg-wrap {
      display: flex;
      flex: 1 1 0;
      min-width: 0;
      align-items: flex-end;
    }
    .section-group-border {
      border: 1px solid #64748b;
      border-radius: 4px;
      box-sizing: border-box;
      pointer-events: none;
      position: absolute;
      z-index: 40;
    }
    .block-signature_field,
    .block-signatures,
    .block-attendance_field,
    .block-attendance,
    .block-date {
      overflow: visible;
      z-index: 2;
    }
    .signatures-block {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 10px;
      box-sizing: border-box;
    }
    .sig-field {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      flex: 1 1 0;
      min-width: 0;
      width: 100%;
      height: 100%;
      justify-content: flex-end;
    }
    .sig {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      flex: 1 1 0;
      min-width: 0;
      margin-top: 0;
    }
    .signatures-block .sig-field {
      flex: 1 1 0;
      min-width: 0;
      height: auto;
    }
    .sig-label {
      font-weight: 600;
      margin-bottom: 2px;
    }
    .sig-line {
      border-bottom: 1px solid #334155;
      min-height: 1.5em;
      padding-bottom: 2px;
    }
    .lines { white-space: pre; }
    .meta-field {
      display: flex;
      flex-direction: row;
      align-items: flex-end;
      justify-content: flex-start;
      gap: 3px;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }
    .meta-field .field-label {
      font-weight: 600;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .meta-field .field-value {
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .meta-field.handwritten .field-line {
      flex: 1 1 auto;
      border-bottom: 1px solid #334155;
      min-height: 1.15em;
      min-width: 12px;
      display: inline-block;
    }
    .profile-name-field {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      direction: rtl;
      text-align: right;
      box-sizing: border-box;
      color: #475569;
    }
    .meta-row {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }
    .meta-seg {
      display: inline-flex;
      flex-direction: row;
      align-items: flex-end;
      gap: 3px;
      flex: 1 1 0;
      min-width: 0;
      white-space: nowrap;
    }
    .meta-seg .field-label {
      font-weight: 600;
      flex-shrink: 0;
    }
    .meta-seg .field-value {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta-seg.studentName { flex: 2 1 0; }
    .meta-seg.handwritten .field-line {
      flex: 1 1 auto;
      border-bottom: 1px solid #334155;
      min-height: 1.15em;
      min-width: 1.5em;
      display: block;
    }
    .block-grades_table {
      overflow: visible;
      z-index: 1;
    }
    .block-evaluation {
      overflow: visible;
      z-index: 2;
    }
    .block-wrap { overflow: visible; }
    .evaluation-block {
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .evaluation-title {
      display: block;
      width: 100%;
      text-align: center;
    }
    .evaluation-body {
      margin-top: 4px;
      width: 100%;
      max-width: 100%;
      text-align: center;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      line-height: 1.5;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="page-content">
    ${backgroundHtml}
    <div class="page-blocks">
    ${blocksHtml}
    ${groupBordersHtml}
    </div>
  </div>
</body>
</html>`;
}
