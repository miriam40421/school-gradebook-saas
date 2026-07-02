'use client';

const NIKUD = [
  { char: 'ַ', name: 'פתח' },
  { char: 'ָ', name: 'קמץ' },
  { char: 'ִ', name: 'חיריק' },
  { char: 'ֵ', name: 'צרי' },
  { char: 'ֶ', name: 'סגול' },
  { char: 'ֹ', name: 'חולם' },
  { char: 'ֻ', name: 'שורוק' },
  { char: 'ּ', name: 'דגש' },
  { char: 'ְ', name: 'שווא' },
  { char: 'ֱ', name: 'חטף סגול' },
  { char: 'ֲ', name: 'חטף פתח' },
  { char: 'ֳ', name: 'חטף קמץ' },
];

type Props = {
  onInsert: (char: string) => void;
};

export function NikudPicker({ onInsert }: Props) {
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
            width: '2rem',
            height: '2rem',
            fontSize: '1.1rem',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            background: '#f8fafc',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {'א' + char}
        </button>
      ))}
    </div>
  );
}
