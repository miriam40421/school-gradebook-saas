import { randomUUID } from 'crypto';
import type {
  CertificateTemplateLayoutV1,
  CertificateTemplateOrientation,
} from '@school/shared';
import { DEFAULT_CERTIFICATE_FONT_SIZE_PT } from '@school/shared';

export function createDefaultLayoutScaffold(
  orientation: CertificateTemplateOrientation,
): CertificateTemplateLayoutV1 {
  return {
    layoutSchemaVersion: 1,
    page: {
      orientation,
      backgroundColor: '#ffffff',
      paddingMm: { top: 10, right: 10, bottom: 10, left: 10 },
    },
    blocks: [
      {
        id: randomUUID(),
        type: 'static_text',
        box: { xMm: 0, yMm: 0, wMm: 190, hMm: 15 },
        style: {
          fontFamily: 'Arial',
          fontSizePt: 18,
          fontWeight: 'bold',
          color: '#1e293b',
          textAlign: 'center',
          backgroundColor: 'transparent',
        },
        props: { text: 'תעודה' },
      },
      {
        id: randomUUID(),
        type: 'grades_table',
        box: { xMm: 0, yMm: 25, wMm: 190, hMm: 120 },
        style: {
          fontFamily: 'Arial',
          fontSizePt: DEFAULT_CERTIFICATE_FONT_SIZE_PT,
          fontWeight: 'normal',
          color: '#1e293b',
          textAlign: 'right',
          backgroundColor: 'transparent',
        },
        props: {
          showHeader: true,
          headerLabels: { subject: 'מקצוע', grade: 'ציון', comment: 'הערה' },
        },
      },
    ],
  };
}
