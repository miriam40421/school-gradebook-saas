'use client';

const NIKUD = [
  { char: 'ַ', name: 'פתח' },
  { char: 'ָ', name: 'קמץ' },
  { char: 'ִ', name: 'חיריק' },
  { char: 'ֵ', name: 'צרי' },
  { char: 'ֶ', name: 'סגול' },
  { char: 'ֹ', name: 'חולם' },
  { char: 'ֻ', name: 'קיבוץ' },
  { char: 'וּ', name: 'שורוק' },
  { char: 'ְ', name: 'שווא' },
  { char: 'ֱ', name: 'חטף סגול' },
  { char: 'ֲ', name: 'חטף פתח' },
  { char: 'ֳ', name: 'חטף קמץ' },
];

const BTN_BASE: React.CSSProperties = {
  width: '2.6rem',
  height: '2.6rem',
  border: '1px solid #cbd5e1',
  borderRadius: '0.375rem',
  background: '#f8fafc',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 2,
  paddingBottom: '0.3rem',
  color: '#111827',
};

type Props = {
  onInsert: (char: string) => void;
  onDelete: () => void;
};

export function NikudPicker({ onInsert, onDelete }: Props) {
  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.25rem',
        marginTop: '0.4rem',
      }}
    >
      {NIKUD.map(({ char, name }) => (
        <button
          key={char}
          type="button"
          title={name}
          onClick={() => onInsert(char)}
          style={{
            ...BTN_BASE,
            fontSize: '1.3rem',
            fontFamily: 'var(--font-noto-serif-hebrew), "Noto Serif Hebrew", "SBL Hebrew", serif',
          }}
        >
          <span style={{ color: '#111827' }}>{'א' + char}</span>
        </button>
      ))}
      {/* Dagesh */}
      <button
        type="button"
        title="דגש"
        onClick={() => onInsert('ּ')}
        style={{
          ...BTN_BASE,
          fontSize: '0.65rem',
          fontFamily: 'var(--font-noto-serif-hebrew), "Noto Serif Hebrew", "SBL Hebrew", serif',
          color: '#111827',
        }}
      >
        דגש
      </button>
      {/* Backspace — delete char/nikud at cursor */}
      <button
        type="button"
        title="מחק תו/ניקוד לפני הסמן"
        onClick={onDelete}
        style={{
          ...BTN_BASE,
          fontSize: '0.9rem',
          color: '#dc2626',
          borderColor: '#fca5a5',
          background: '#fef2f2',
          minWidth: '2.6rem',
        }}
      >
        ⌫
      </button>
    </div>
  );
}
