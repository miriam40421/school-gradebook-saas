import type { CSSProperties } from 'react';
import type { CertificatePrefs, CertificateTemplateOrientation, LayoutBlock } from '@school/shared';
import {
  attendanceFieldEnabled,
  certificateFillView,
  certificateFieldHandwritten,
  certificateFieldLabel,
  headerMetaFieldVisible,
  HEADER_META_ROW_FIELD_KEYS,
  signatureTypeEnabled,
  EVALUATION_HANDWRITTEN_LINE_COUNT,
  normalizeCertificatePrefs,
  DEFAULT_GRADES_TABLE_HEADER_LABELS,
} from '@school/shared';

type FieldKey = Extract<LayoutBlock, { type: 'field' }>['props']['fieldKey'];

export const CERTIFICATE_FONT_FAMILIES = [
  'Arial',
  'David',
  'Tahoma',
  'Times New Roman',
  'Calibri',
  'Assistant',
] as const;

export const FIELD_DEMO_VALUES: Record<FieldKey, string> = {
  studentName: 'ישראל ישראלי',
  className: 'ג׳1',
  termName: 'מחצית א׳',
  schoolName: 'בית ספר לדוגמה',
  classYearHebrew: 'תשפ״ה',
  cohort: 'תשפ״ה',
  profileName: 'א–ד',
};

const ATTENDANCE_DEMO_VALUES: Record<
  Extract<LayoutBlock, { type: 'attendance_field' }>['props']['fieldKey'],
  string
> = {
  absences: '2',
  lateness: '1',
  hourAbsences: '3',
  hourLateness: '1',
};

function blockTextStyle(block: LayoutBlock): CSSProperties {
  const allowOverflow =
    block.type === 'evaluation' ||
    block.type === 'attendance' ||
    block.type === 'attendance_field' ||
    block.type === 'signature_field' ||
    block.type === 'signatures' ||
    block.type === 'date';
  return {
    fontFamily: block.style.fontFamily,
    fontSize: `${block.style.fontSizePt}pt`,
    fontWeight: block.style.fontWeight,
    color: block.style.color,
    textAlign: block.style.textAlign,
    width: '100%',
    height: '100%',
    overflow: allowOverflow ? 'visible' : 'hidden',
    wordBreak: 'break-word',
    lineHeight: 1.25,
    boxSizing: 'border-box',
  };
}

function underlineLineStyle(minHeight = '1.25em'): CSSProperties {
  return {
    borderBottom: '1px solid #334155',
    minHeight,
    flex: 1,
    minWidth: 48,
  };
}

function sectionBorderStyle(enabled: boolean | undefined): CSSProperties {
  return enabled
    ? { outline: '1px solid #64748b', outlineOffset: 2, borderRadius: 4 }
    : {};
}

function disabledHint(text: string): CSSProperties {
  return { opacity: 0.45, fontSize: '0.7rem', fontStyle: 'italic' };
}

export function DesignerBlockPreview({
  block,
  categoryById,
  previewPrefs,
  previewProfileName,
  orientation = 'portrait',
}: {
  block: LayoutBlock;
  categoryById: Map<string, string>;
  previewPrefs?: CertificatePrefs | null;
  previewProfileName?: string | null;
  orientation?: CertificateTemplateOrientation;
}) {
  const prefs = previewPrefs ? normalizeCertificatePrefs(previewPrefs) : null;
  const fill = prefs ? certificateFillView(prefs) : null;
  const isLandscape = orientation === 'landscape';
  const narrowBlock = block.box.wMm < 72;
  const style = blockTextStyle(block);
  const evalLineCount = isLandscape ? 2 : EVALUATION_HANDWRITTEN_LINE_COUNT;

  switch (block.type) {
    case 'static_text':
      return (
        <div style={style}>
          {block.props.text || '\u00a0'}
        </div>
      );
    case 'header_meta_row': {
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: isLandscape ? 4 : 8,
            flexWrap: 'nowrap',
            fontSize: isLandscape ? '0.8em' : undefined,
          }}
        >
          {HEADER_META_ROW_FIELD_KEYS.map((fieldKey) => {
            const label = certificateFieldLabel(fieldKey) ?? fieldKey;
            const visible = !prefs || headerMetaFieldVisible(prefs, fieldKey);
            const handwritten = fill && certificateFieldHandwritten(fill, fieldKey);
            const segStyle: CSSProperties = {
              display: 'inline-flex',
              alignItems: 'flex-end',
              gap: 3,
              flex: 1,
              minWidth: 0,
            };
            if (!visible) {
              return (
                <span key={fieldKey} style={{ ...segStyle, opacity: 0.4, fontSize: '0.7rem' }}>
                  {label} (כבוי)
                </span>
              );
            }
            if (handwritten) {
              return (
                <span key={fieldKey} style={segStyle}>
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}:</span>
                  <span style={{ flex: 1, borderBottom: '1px solid #334155', minHeight: '1em' }} />
                </span>
              );
            }
            const demo = FIELD_DEMO_VALUES[fieldKey as FieldKey] ?? '—';
            return (
              <span key={fieldKey} style={{ ...segStyle, fontSize: '0.85em' }}>
                <span style={{ fontWeight: 600 }}>{label}:</span>
                <span>{demo}</span>
              </span>
            );
          })}
        </div>
      );
    }
    case 'field': {
      if (block.props.fieldKey === 'profileName') {
        if (!prefs?.showProfileNameOnCertificate) {
          return (
            <div style={{ ...style, opacity: 0.45, fontSize: '0.75rem' }}>
              שם פרופיל (כבוי בהגדרות)
            </div>
          );
        }
        return (
          <div style={{ ...style, color: '#475569' }}>
            {previewProfileName?.trim() || FIELD_DEMO_VALUES.profileName}
          </div>
        );
      }
      const handwritten =
        fill && certificateFieldHandwritten(fill, block.props.fieldKey);
      const label = certificateFieldLabel(block.props.fieldKey);
      const visible =
        !prefs || headerMetaFieldVisible(prefs, block.props.fieldKey);
      if (block.props.fieldKey === 'schoolName') {
        return <div style={{ ...style, opacity: 0.35, fontSize: '0.7rem' }}>—</div>;
      }
      if (!visible) {
        return (
          <div style={{ ...style, opacity: 0.45, fontSize: '0.75rem' }}>
            {label ?? block.props.fieldKey} (כבוי בהגדרות)
          </div>
        );
      }
      if (handwritten && label) {
        return (
          <div style={{ ...style, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}:</span>
            <span style={{ flex: 1, borderBottom: '1px solid #334155', minHeight: '1em' }} />
          </div>
        );
      }
      const value = FIELD_DEMO_VALUES[block.props.fieldKey as FieldKey];
      return (
        <div style={style}>
          {label ? (
            <>
              <span style={{ fontWeight: 600 }}>{label}: </span>
              {value}
            </>
          ) : (
            value
          )}
        </div>
      );
    }
    case 'logo':
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            opacity: 0.65,
          }}
        >
          {block.props.storageKey ? 'לוגו' : 'לוגו (לא הועלה)'}
        </div>
      );
    case 'grades_table': {
      const catLabel = block.props.categoryId
        ? categoryById.get(block.props.categoryId) ?? 'קטגוריה'
        : null;
      const showComment = Boolean(prefs?.commentPerGrade);
      const commentHandwritten = fill?.gradeCommentsHandwritten ?? true;
      const labels = block.props.headerLabels ?? DEFAULT_GRADES_TABLE_HEADER_LABELS;
      const headers = block.props.showHeader
        ? showComment
          ? `${labels.subject} | ${labels.grade} | ${labels.comment}`
          : `${labels.subject} | ${labels.grade}`
        : null;
      const commentCell = showComment
        ? commentHandwritten
          ? ' ___'
          : ' · טוב'
        : '';
      const tableFontPt = isLandscape || narrowBlock
        ? Math.max(5, block.style.fontSizePt - 3)
        : Math.max(6, block.style.fontSizePt - 2);
      return (
        <div
          style={{
            ...style,
            fontSize: `${tableFontPt}pt`,
            lineHeight: 1.2,
            overflow: 'visible',
          }}
        >
          {catLabel && (
            <div
              style={{
                fontWeight: 700,
                textAlign: 'center',
                padding: isLandscape ? '2px 4px' : '3px 6px',
                marginBottom: 2,
                background: 'linear-gradient(180deg, #f8fafc, #e2e8f0)',
                border: '1px solid #94a3b8',
                borderRadius: '4px 4px 0 0',
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'visible',
                textOverflow: 'ellipsis',
              }}
            >
              {catLabel}
            </div>
          )}
          {!catLabel && (
            <div style={{ fontWeight: 600, marginBottom: 2, opacity: 0.7, fontSize: '0.9em' }}>
              כל הקטגוריות
            </div>
          )}
          {headers && (
            <div style={{ opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {headers}
            </div>
          )}
          <div style={{ opacity: 0.6, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            מתמטיקה · טוב{commentCell}
          </div>
          {!isLandscape && (
            <div style={{ opacity: 0.6 }}>אנגלית · מצוין{commentCell}</div>
          )}
        </div>
      );
    }
    case 'attendance_field': {
      const enabled =
        !prefs || attendanceFieldEnabled(prefs, block.props.fieldKey);
      const handwritten = fill?.attendanceHandwritten ?? true;
      const fieldBorder = prefs?.attendanceFieldBorder;
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            flexDirection: isLandscape || narrowBlock ? 'column' : 'row',
            alignItems: isLandscape || narrowBlock ? 'stretch' : 'flex-end',
            gap: isLandscape ? 2 : 4,
            fontSize: isLandscape ? '0.78em' : undefined,
            overflow: 'visible',
            ...sectionBorderStyle(fieldBorder),
          }}
        >
          <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {block.props.label}:
          </span>{' '}
          {enabled ? (
            handwritten ? (
              <span style={underlineLineStyle()} />
            ) : (
              ATTENDANCE_DEMO_VALUES[block.props.fieldKey]
            )
          ) : (
            <span style={disabledHint('')}>כבוי בהגדרות</span>
          )}
        </div>
      );
    }
    case 'attendance': {
      const handwritten = fill?.attendanceHandwritten ?? true;
      const fieldBorder = prefs?.attendanceFieldBorder;
      const rows: Array<{ label: string; show: boolean }> = [
        { label: 'חיסורים', show: Boolean(prefs?.absences ?? block.props.showAbsences) },
        { label: 'איחורים', show: Boolean(prefs?.lateness ?? block.props.showLateness) },
        {
          label: 'חיסורי שעות',
          show: Boolean(prefs?.hourAbsences ?? block.props.showHourAbsences),
        },
        {
          label: 'איחורי שעות',
          show: Boolean(prefs?.hourLateness ?? block.props.showHourLateness),
        },
      ].filter((row) => row.show);
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 8,
            direction: 'rtl',
            ...sectionBorderStyle(fieldBorder),
          }}
        >
          {rows.map((row) => (
            <div key={row.label} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontWeight: 600 }}>{row.label}:</span>
                {handwritten ? (
                  <span style={underlineLineStyle()} />
                ) : (
                  <span>0</span>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case 'evaluation': {
      const handwritten = fill?.evaluationHandwritten ?? true;
      const bordered = prefs?.evaluationBorder;
      const showEvaluation = prefs ? Boolean(prefs.evaluation || prefs.homeroomComment) : true;
      return (
        <div
          style={{
            ...style,
            textAlign: 'center',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            ...sectionBorderStyle(bordered),
          }}
        >
          <strong>{block.props.title}</strong>
          {!showEvaluation ? (
            <div style={{ marginTop: 4, opacity: 0.45, fontSize: '0.75rem' }}>כבוי בהגדרות</div>
          ) : handwritten ? (
            <div style={{ marginTop: isLandscape ? 4 : 6, display: 'flex', flexDirection: 'column', gap: isLandscape ? 4 : 6 }}>
              {Array.from({ length: evalLineCount }).map((_, i) => (
                <div
                  key={i}
                  style={{ borderBottom: '1px solid #334155', minHeight: isLandscape ? '1.1em' : '1.35em', width: '100%' }}
                />
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 2, opacity: 0.75 }}>
              תלמידה מצטיינת, משתתפת בשיעור באופן פעיל ומלאת מוטיבציה.
            </div>
          )}
        </div>
      );
    }
    case 'signature_field': {
      const enabled =
        !prefs ||
        (prefs.signatures && signatureTypeEnabled(prefs, block.props.signatureKey));
      const handwritten = fill?.signaturesHandwritten ?? true;
      const fieldBorder = prefs?.signatureFieldBorder;
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            fontSize: isLandscape ? '0.78em' : undefined,
            overflow: 'visible',
            ...sectionBorderStyle(fieldBorder),
          }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: 2,
              whiteSpace: 'nowrap',
              overflow: 'visible',
              textOverflow: 'ellipsis',
            }}
          >
            {block.props.label}
          </div>
          {enabled ? (
            <div style={underlineLineStyle(handwritten ? '1.5em' : '1em')} />
          ) : (
            <span style={disabledHint('')}>כבוי בהגדרות</span>
          )}
        </div>
      );
    }
    case 'signatures': {
      const rows = [
        { type: 'homeroom' as const, label: block.props.labels.homeroom },
        { type: 'principal' as const, label: block.props.labels.principal },
        { type: 'parent' as const, label: block.props.labels.parent },
      ].filter((row) => !prefs || signatureTypeEnabled(prefs, row.type));
      const showDate = !prefs || prefs.dateOnCertificate !== false;
      const handwritten = fill?.signaturesHandwritten ?? true;
      const fieldBorder = prefs?.signatureFieldBorder;
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 8,
            direction: 'rtl',
            ...sectionBorderStyle(fieldBorder),
          }}
        >
          {rows.map((row) => (
            <div key={row.type} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{row.label}</div>
              <div style={underlineLineStyle(handwritten ? '1.5em' : '1em')} />
            </div>
          ))}
          {showDate && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{certificateFieldLabel('date') ?? 'תאריך'}</div>
              <div style={underlineLineStyle('1em')} />
            </div>
          )}
          {rows.length === 0 && !showDate && (
            <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>חתימות כבויות בהגדרות</span>
          )}
        </div>
      );
    }
    case 'date': {
      const label = certificateFieldLabel('date') ?? 'תאריך';
      const dateBorder = prefs?.dateBorder;
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            fontSize: isLandscape ? '0.78em' : undefined,
            overflow: 'visible',
            ...sectionBorderStyle(dateBorder),
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2, whiteSpace: 'nowrap' }}>{label}</div>
          <div
            style={{
              borderBottom: '1px solid #334155',
              minHeight: '1em',
              paddingBottom: 2,
              opacity: fill?.dateHandwritten ? 1 : 0.85,
            }}
          >
            {fill?.dateHandwritten ? '\u00a0' : 'י״ד בסיון תשפ״ה'}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
