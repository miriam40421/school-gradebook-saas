import type {
  CertificateTemplateLayoutV1,
  CertificateTemplateOrientation,
  LayoutBlock,
} from '@school/shared';
import { A4_DIMENSIONS_MM, normalizeCertificateTemplatePage } from '@school/shared';

const A4 = A4_DIMENSIONS_MM;

export const MAX_LAYOUT_BLOCKS = 40;
export const MAX_LAYOUT_JSON_BYTES = 512 * 1024;

const BLOCK_TYPES = new Set([
  'static_text',
  'logo',
  'field',
  'header_meta_row',
  'grades_table',
  'attendance',
  'attendance_field',
  'evaluation',
  'signatures',
  'signature_field',
  'date',
]);

const FIELD_KEYS = new Set([
  'studentName',
  'className',
  'termName',
  'schoolName',
  'classYearHebrew',
  'cohort',
  'profileName',
]);

const ATTENDANCE_FIELD_KEYS = new Set([
  'absences',
  'lateness',
  'hourAbsences',
  'hourLateness',
]);

const SIGNATURE_FIELD_KEYS = new Set(['homeroom', 'principal', 'parent']);

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SCRIPT_TAG = /<script/i;

export class LayoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LayoutValidationError';
  }
}

function printableArea(orientation: CertificateTemplateOrientation, padding: {
  top: number;
  right: number;
  bottom: number;
  left: number;
}) {
  const page = A4[orientation];
  return {
    width: page.width - padding.left - padding.right,
    height: page.height - padding.top - padding.bottom,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateBox(
  box: unknown,
  area: { width: number; height: number },
  blockIndex: number,
) {
  if (!isRecord(box)) {
    throw new LayoutValidationError(`Block ${blockIndex}: invalid box`);
  }
  const xMm = box.xMm;
  const yMm = box.yMm;
  const wMm = box.wMm;
  const hMm = box.hMm;
  if (
    typeof xMm !== 'number' ||
    typeof yMm !== 'number' ||
    typeof wMm !== 'number' ||
    typeof hMm !== 'number' ||
    wMm <= 0 ||
    hMm <= 0
  ) {
    throw new LayoutValidationError(`Block ${blockIndex}: invalid box dimensions`);
  }
  if (xMm < 0 || yMm < 0 || xMm + wMm > area.width + 0.01 || yMm + hMm > area.height + 0.01) {
    throw new LayoutValidationError(`Block ${blockIndex}: box outside printable area`);
  }
}

function validateStyle(style: unknown, blockIndex: number) {
  if (!isRecord(style)) {
    throw new LayoutValidationError(`Block ${blockIndex}: invalid style`);
  }
  const fontSizePt = style.fontSizePt;
  if (typeof fontSizePt !== 'number' || fontSizePt < 6 || fontSizePt > 72) {
    throw new LayoutValidationError(`Block ${blockIndex}: fontSizePt out of range`);
  }
  const color = style.color;
  if (typeof color !== 'string' || (!HEX_COLOR.test(color) && color !== 'transparent')) {
    throw new LayoutValidationError(`Block ${blockIndex}: invalid color`);
  }
  const textAlign = style.textAlign;
  if (textAlign !== 'right' && textAlign !== 'center' && textAlign !== 'left') {
    throw new LayoutValidationError(`Block ${blockIndex}: invalid textAlign`);
  }
}

function validateBlockProps(block: LayoutBlock, blockIndex: number) {
  const props = block.props as Record<string, unknown>;
  switch (block.type) {
    case 'static_text': {
      const text = props.text;
      if (typeof text !== 'string') {
        throw new LayoutValidationError(`Block ${blockIndex}: static_text requires text`);
      }
      if (SCRIPT_TAG.test(text)) {
        throw new LayoutValidationError(`Block ${blockIndex}: static_text contains forbidden content`);
      }
      break;
    }
    case 'logo': {
      if (props.objectFit !== 'contain' && props.objectFit !== 'cover') {
        throw new LayoutValidationError(`Block ${blockIndex}: invalid logo objectFit`);
      }
      break;
    }
    case 'field': {
      if (!FIELD_KEYS.has(String(props.fieldKey))) {
        throw new LayoutValidationError(`Block ${blockIndex}: invalid fieldKey`);
      }
      break;
    }
    case 'attendance_field': {
      if (!ATTENDANCE_FIELD_KEYS.has(String(props.fieldKey))) {
        throw new LayoutValidationError(`Block ${blockIndex}: invalid attendance fieldKey`);
      }
      if (typeof props.label !== 'string' || !props.label.trim()) {
        throw new LayoutValidationError(`Block ${blockIndex}: attendance_field requires label`);
      }
      if (SCRIPT_TAG.test(props.label)) {
        throw new LayoutValidationError(`Block ${blockIndex}: attendance_field label forbidden content`);
      }
      break;
    }
    case 'signature_field': {
      if (!SIGNATURE_FIELD_KEYS.has(String(props.signatureKey))) {
        throw new LayoutValidationError(`Block ${blockIndex}: invalid signatureKey`);
      }
      if (typeof props.label !== 'string' || !props.label.trim()) {
        throw new LayoutValidationError(`Block ${blockIndex}: signature_field requires label`);
      }
      if (SCRIPT_TAG.test(props.label)) {
        throw new LayoutValidationError(`Block ${blockIndex}: signature_field label forbidden content`);
      }
      break;
    }
    case 'date': {
      if (props.format !== 'hebrew') {
        throw new LayoutValidationError(`Block ${blockIndex}: invalid date format`);
      }
      break;
    }
    default:
      break;
  }
}

export function validateLayoutJson(
  layout: unknown,
  serializedSizeBytes?: number,
): CertificateTemplateLayoutV1 {
  if (!isRecord(layout)) {
    throw new LayoutValidationError('Layout must be an object');
  }
  if (layout.layoutSchemaVersion !== 1) {
    throw new LayoutValidationError('layoutSchemaVersion must be 1');
  }
  if (!Array.isArray(layout.blocks)) {
    throw new LayoutValidationError('blocks must be an array');
  }
  if (layout.blocks.length > MAX_LAYOUT_BLOCKS) {
    throw new LayoutValidationError(`Maximum ${MAX_LAYOUT_BLOCKS} blocks allowed`);
  }
  if (
    serializedSizeBytes !== undefined &&
    serializedSizeBytes > MAX_LAYOUT_JSON_BYTES
  ) {
    throw new LayoutValidationError('layout_json exceeds size limit');
  }
  const page = layout.page;
  if (!isRecord(page)) {
    throw new LayoutValidationError('page settings required');
  }
  const orientation = page.orientation;
  if (orientation !== 'portrait' && orientation !== 'landscape') {
    throw new LayoutValidationError('Invalid page orientation');
  }
  const padding = page.paddingMm;
  if (!isRecord(padding)) {
    throw new LayoutValidationError('page.paddingMm required');
  }
  const bgColor = page.backgroundColor;
  if (typeof bgColor !== 'string' || (!HEX_COLOR.test(bgColor) && bgColor !== 'transparent')) {
    throw new LayoutValidationError('Invalid page backgroundColor');
  }
  const bgKey = page.backgroundImageStorageKey;
  if (bgKey !== undefined && bgKey !== null && typeof bgKey !== 'string') {
    throw new LayoutValidationError('Invalid backgroundImageStorageKey');
  }
  const bgMode = page.backgroundImageMode;
  if (bgMode !== undefined && bgMode !== 'none' && bgMode !== 'full' && bgMode !== 'corner') {
    throw new LayoutValidationError('Invalid backgroundImageMode');
  }
  const bgFit = page.backgroundImageFit;
  if (bgFit !== undefined && bgFit !== 'cover' && bgFit !== 'contain') {
    throw new LayoutValidationError('Invalid backgroundImageFit');
  }
  const area = printableArea(orientation, {
    top: Number(padding.top) || 0,
    right: Number(padding.right) || 0,
    bottom: Number(padding.bottom) || 0,
    left: Number(padding.left) || 0,
  });

  layout.blocks.forEach((raw, index) => {
    if (!isRecord(raw)) {
      throw new LayoutValidationError(`Block ${index}: invalid block`);
    }
    if (!BLOCK_TYPES.has(String(raw.type))) {
      throw new LayoutValidationError(`Block ${index}: unknown type`);
    }
    if (typeof raw.id !== 'string' || !raw.id.trim()) {
      throw new LayoutValidationError(`Block ${index}: id required`);
    }
    validateBox(raw.box, area, index);
    validateStyle(raw.style, index);
    validateBlockProps(raw as LayoutBlock, index);
  });

  return {
    ...(layout as CertificateTemplateLayoutV1),
    page: normalizeCertificateTemplatePage((layout as CertificateTemplateLayoutV1).page),
  };
}

export function layoutSerializedSize(layout: unknown): number {
  return Buffer.byteLength(JSON.stringify(layout), 'utf8');
}

/** Clamp block boxes to the printable area (fixes legacy page-relative coords). */
export function clampLayoutToPrintableArea(
  layout: CertificateTemplateLayoutV1,
): CertificateTemplateLayoutV1 {
  const area = printableArea(layout.page.orientation, layout.page.paddingMm);
  return {
    ...layout,
    blocks: layout.blocks.map((block) => {
      let { xMm, yMm, wMm, hMm } = block.box;
      xMm = Math.max(0, Math.min(xMm, area.width - 1));
      yMm = Math.max(0, Math.min(yMm, area.height - 1));
      wMm = Math.max(1, Math.min(wMm, area.width - xMm));
      hMm = Math.max(1, Math.min(hMm, area.height - yMm));
      return { ...block, box: { xMm, yMm, wMm, hMm } };
    }),
  };
}
