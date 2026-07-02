import type {
  CertificateTemplateLayoutV1,
  CertificateTemplateOrientation,
} from '@school/shared';
import { A4_DIMENSIONS_MM } from '@school/shared';

/** Pixels per millimeter on the designer canvas (210mm → 420px width). */
export const MM_TO_PX = 2;

export function printableAreaMm(layout: CertificateTemplateLayoutV1) {
  const dims = A4_DIMENSIONS_MM[layout.page.orientation];
  const pad = layout.page.paddingMm;
  return {
    width: dims.width - pad.left - pad.right,
    height: dims.height - pad.top - pad.bottom,
  };
}

export function canvasSizePx(orientation: CertificateTemplateOrientation) {
  const dims = A4_DIMENSIONS_MM[orientation];
  return {
    width: dims.width * MM_TO_PX,
    height: dims.height * MM_TO_PX,
  };
}

export function printableAreaSizePx(layout: CertificateTemplateLayoutV1) {
  const area = printableAreaMm(layout);
  return {
    width: mmToPx(area.width),
    height: mmToPx(area.height),
  };
}

export function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

export function pxToMm(px: number): number {
  return px / MM_TO_PX;
}

const GRID_MM = 10;

/** CSS background for 10mm alignment grid + center guides. */
export function designerGridBackground(): {
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
} {
  const step = mmToPx(GRID_MM);
  return {
    backgroundColor: '#fafafa',
    backgroundImage: [
      `linear-gradient(to right, #e2e8f0 1px, transparent 1px)`,
      `linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`,
      `linear-gradient(to right, transparent calc(50% - 0.5px), #94a3b8 calc(50% - 0.5px), #94a3b8 calc(50% + 0.5px), transparent calc(50% + 0.5px))`,
      `linear-gradient(to bottom, transparent calc(50% - 0.5px), #94a3b8 calc(50% - 0.5px), #94a3b8 calc(50% + 0.5px), transparent calc(50% + 0.5px))`,
    ].join(', '),
    backgroundSize: `${step}px ${step}px, ${step}px ${step}px, 100% 100%, 100% 100%`,
  };
}
