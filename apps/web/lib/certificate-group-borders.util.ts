import type { CertificatePrefs, LayoutBlock } from '@school/shared';
import {
  attendanceFieldEnabled,
  signatureTypeEnabled,
} from '@school/shared';

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

function attendanceBlockVisible(block: LayoutBlock, prefs: CertificatePrefs): boolean {
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

function footerBlockVisible(block: LayoutBlock, prefs: CertificatePrefs): boolean {
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

export type CertificateGroupBorderOverlay = {
  id: string;
  box: BoxMm;
};

function groupBorderMarginMm(prefs: CertificatePrefs): number {
  const nested =
    (prefs.attendanceBorder && prefs.attendanceFieldBorder) ||
    (prefs.signaturesBorder && prefs.signatureFieldBorder) ||
    (prefs.signaturesBorder && prefs.dateBorder);
  return nested ? 4 : 2;
}

export function computeCertificateGroupBorderOverlays(
  blocks: LayoutBlock[],
  prefs: CertificatePrefs,
  boxForBlock: (blockId: string) => BoxMm,
): CertificateGroupBorderOverlay[] {
  const overlays: CertificateGroupBorderOverlay[] = [];
  const margin = groupBorderMarginMm(prefs);

  if (prefs.attendanceBorder) {
    const boxes = blocks
      .filter((b) => attendanceBlockVisible(b, prefs))
      .map((b) => boxForBlock(b.id));
    const union = unionBoxes(boxes);
    if (union) overlays.push({ id: 'attendance-group', box: expandBox(union, margin) });
  }

  if (prefs.signaturesBorder) {
    const boxes = blocks
      .filter((b) => footerBlockVisible(b, prefs))
      .map((b) => boxForBlock(b.id));
    const union = unionBoxes(boxes);
    if (union) overlays.push({ id: 'signatures-group', box: expandBox(union, margin) });
  }

  return overlays;
}
