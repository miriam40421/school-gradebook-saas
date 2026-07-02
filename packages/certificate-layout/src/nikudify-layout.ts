import type { CertificateTemplateLayoutV1 } from '@school/shared';

type NikudFn = (text: string) => Promise<string>;

function hasNikud(text: string): boolean {
  return /[ְ-ֽֿׁׂ]/.test(text);
}

async function maybeNikudText(text: string, nikud: NikudFn): Promise<string> {
  if (!text.trim() || hasNikud(text)) return text;
  return nikud(text);
}

/** Nikudify all user-entered text labels in a template layout. */
export async function nikudifyLayout(
  layout: CertificateTemplateLayoutV1,
  nikud: NikudFn,
): Promise<CertificateTemplateLayoutV1> {
  const blocks = await Promise.all(
    layout.blocks.map(async (block) => {
      if (block.type === 'static_text') {
        return { ...block, props: { ...block.props, text: await maybeNikudText(block.props.text, nikud) } };
      }
      if (block.type === 'evaluation') {
        return { ...block, props: { ...block.props, title: await maybeNikudText(block.props.title, nikud) } };
      }
      if (block.type === 'signatures') {
        return {
          ...block,
          props: {
            ...block.props,
            labels: {
              homeroom: await maybeNikudText(block.props.labels.homeroom, nikud),
              principal: await maybeNikudText(block.props.labels.principal, nikud),
              parent: await maybeNikudText(block.props.labels.parent, nikud),
            },
          },
        };
      }
      if (block.type === 'signature_field') {
        return { ...block, props: { ...block.props, label: await maybeNikudText(block.props.label, nikud) } };
      }
      if (block.type === 'attendance_field') {
        return { ...block, props: { ...block.props, label: await maybeNikudText(block.props.label, nikud) } };
      }
      if (block.type === 'grades_table') {
        return {
          ...block,
          props: {
            ...block.props,
            headerLabels: {
              subject: await maybeNikudText(block.props.headerLabels.subject, nikud),
              grade: await maybeNikudText(block.props.headerLabels.grade, nikud),
              comment: await maybeNikudText(block.props.headerLabels.comment, nikud),
            },
          },
        };
      }
      return block;
    }),
  );
  return { ...layout, blocks };
}
