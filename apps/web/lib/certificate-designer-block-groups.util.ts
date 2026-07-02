import type { CertificateTemplateLayoutV1, LayoutBlock } from '@school/shared';

type BoxMm = { xMm: number; yMm: number; wMm: number; hMm: number };

export type DesignerBlockGroup = {
  id: 'attendance-group' | 'signatures-group';
  label: string;
  blockIds: string[];
  box: BoxMm;
};

function unionBoxes(boxes: BoxMm[]): BoxMm | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((b) => b.xMm));
  const top = Math.min(...boxes.map((b) => b.yMm));
  const right = Math.max(...boxes.map((b) => b.xMm + b.wMm));
  const bottom = Math.max(...boxes.map((b) => b.yMm + b.hMm));
  return { xMm: left, yMm: top, wMm: right - left, hMm: bottom - top };
}

export function computeDesignerBlockGroups(
  layout: CertificateTemplateLayoutV1,
  boxForBlock: (blockId: string) => BoxMm,
): DesignerBlockGroup[] {
  const groups: DesignerBlockGroup[] = [];
  const hasCompositeAttendance = layout.blocks.some((b) => b.type === 'attendance');
  const hasCompositeSignatures = layout.blocks.some((b) => b.type === 'signatures');

  if (!hasCompositeAttendance) {
    const blockIds = layout.blocks
      .filter((b): b is LayoutBlock & { type: 'attendance_field' } => b.type === 'attendance_field')
      .map((b) => b.id);
    if (blockIds.length > 0) {
      const union = unionBoxes(blockIds.map((id) => boxForBlock(id)));
      if (union) {
        groups.push({
          id: 'attendance-group',
          label: 'נוכחות — בלוק כולל',
          blockIds,
          box: union,
        });
      }
    }
  }

  if (!hasCompositeSignatures) {
    const blockIds = layout.blocks
      .filter(
        (b) => b.type === 'signature_field' || b.type === 'date',
      )
      .map((b) => b.id);
    if (blockIds.length > 0) {
      const union = unionBoxes(blockIds.map((id) => boxForBlock(id)));
      if (union) {
        groups.push({
          id: 'signatures-group',
          label: 'חתימות + תאריך — בלוק כולל',
          blockIds,
          box: union,
        });
      }
    }
  }

  return groups;
}
