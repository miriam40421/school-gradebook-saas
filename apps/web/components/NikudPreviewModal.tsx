'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Wand2 } from 'lucide-react';
import type { CertificatePrefs, CertificateSupplementDto } from '@school/shared';
import { apiFetch, getToken } from '@/lib/api';
import { he } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { NikudPicker } from '@/components/NikudPicker';

type Field = {
  key: keyof Pick<CertificateSupplementDto, 'evaluation' | 'homeroomSignature' | 'principalSignature'>;
  label: string;
  multiline?: boolean;
};

type CommentField = { subjectId: string; subjectName: string; value: string };

type Props = {
  snapshotId: string;
  studentName: string;
  supplement: CertificateSupplementDto;
  prefs: CertificatePrefs;
  subjectNames: Record<string, string>;
  classId: string;
  termId: string;
  onClose: () => void;
  onSaved: () => void;
};

function insertAtCursor(el: HTMLTextAreaElement | HTMLInputElement, char: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const next = el.value.slice(0, start) + char + el.value.slice(end);
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set ?? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  nativeInputValueSetter?.call(el, next);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  requestAnimationFrame(() => {
    el.selectionStart = start + 1;
    el.selectionEnd = start + 1;
    el.focus();
  });
}

export function NikudPreviewModal({
  snapshotId,
  studentName,
  supplement,
  prefs,
  subjectNames,
  classId,
  termId,
  onClose,
  onSaved,
}: Props) {
  const token = getToken();
  const htmlUrl = token
    ? `/api/html-preview/snapshot/${snapshotId}?token=${encodeURIComponent(token)}`
    : null;

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (prefs.evaluation) init['evaluation'] = supplement.evaluation ?? '';
    if (prefs.signatures !== false) {
      if (prefs.signatureHomeroom !== false) init['homeroomSignature'] = supplement.homeroomSignature ?? '';
      if (prefs.signaturePrincipal !== false) init['principalSignature'] = supplement.principalSignature ?? '';
    }
    const comments = supplement.gradeComments ?? {};
    for (const [sid, val] of Object.entries(comments)) {
      init[`comment:${sid}`] = val ?? '';
    }
    return init;
  });

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [nikudLoading, setNikudLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLTextAreaElement | HTMLInputElement | null>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const autoNikud = useCallback(async (key: string, text: string) => {
    if (!text.trim()) return;
    setNikudLoading(key);
    try {
      const res = await apiFetch<{ result: string }>('/certificates/nikud-text', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setValues((prev) => ({ ...prev, [key]: res.result }));
    } catch {
      // ignore nikud failure
    } finally {
      setNikudLoading(null);
    }
  }, []);

  const handleInsert = useCallback((char: string) => {
    if (!activeKey) return;
    const el = inputRefs.current[activeKey];
    if (!el) return;
    insertAtCursor(el, char);
    setValues((prev) => ({ ...prev, [activeKey]: el.value }));
  }, [activeKey]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const gradeComments: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(values)) {
        if (k.startsWith('comment:')) {
          gradeComments[k.slice(8)] = v || null;
        }
      }
      await apiFetch('/certificates/supplements', {
        method: 'PUT',
        body: JSON.stringify({
          classId,
          termId,
          items: [{
            studentId: supplement.studentId,
            evaluation: values['evaluation'] || null,
            homeroomSignature: values['homeroomSignature'] || null,
            principalSignature: values['principalSignature'] || null,
            gradeComments: Object.keys(gradeComments).length ? gradeComments : undefined,
          }],
        }),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const mainFields: Field[] = [
    ...(prefs.evaluation ? [{ key: 'evaluation' as const, label: he.certEvaluation, multiline: true }] : []),
    ...(prefs.signatureHomeroom !== false && prefs.signatures !== false
      ? [{ key: 'homeroomSignature' as const, label: he.certHomeroomSignature }]
      : []),
    ...(prefs.signaturePrincipal !== false && prefs.signatures !== false
      ? [{ key: 'principalSignature' as const, label: he.certPrincipalSignature }]
      : []),
  ];

  const commentFields: CommentField[] = Object.entries(supplement.gradeComments ?? {})
    .map(([sid, val]) => ({
      subjectId: sid,
      subjectName: subjectNames[sid] ?? sid,
      value: values[`comment:${sid}`] ?? val ?? '',
    }));

  const renderFieldBlock = (key: string, label: string, multiline?: boolean) => {
    const val = values[key] ?? '';
    const isActive = activeKey === key;
    const loading = nikudLoading === key;
    return (
      <div key={key} style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>{label}</label>
          <button
            type="button"
            title="ניקוד אוטומטי"
            disabled={loading || !val.trim()}
            onClick={() => autoNikud(key, val)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.2rem',
              fontSize: '0.7rem', padding: '0.1rem 0.4rem',
              border: '1px solid #cbd5e1', borderRadius: '0.3rem',
              background: '#f1f5f9', cursor: 'pointer', color: '#64748b',
            }}
          >
            <Wand2 style={{ width: 10, height: 10 }} />
            {loading ? '...' : 'נקד'}
          </button>
        </div>
        {multiline ? (
          <textarea
            ref={(el) => { inputRefs.current[key] = el; }}
            value={val}
            rows={3}
            onFocus={() => setActiveKey(key)}
            onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
            dir="rtl"
            style={{ width: '100%', resize: 'vertical', padding: '0.4rem', fontSize: '0.95rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
          />
        ) : (
          <input
            ref={(el) => { inputRefs.current[key] = el; }}
            type="text"
            value={val}
            onFocus={() => setActiveKey(key)}
            onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
            dir="rtl"
            style={{ width: '100%', padding: '0.4rem', fontSize: '0.95rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem' }}
          />
        )}
        {isActive && <NikudPicker onInsert={handleInsert} />}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`עריכת ניקוד — ${studentName}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'stretch',
        background: 'rgba(15,23,42,0.6)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          display: 'flex', width: '100%', maxWidth: '64rem',
          margin: 'auto', background: '#fff',
          borderRadius: '1rem', overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: HTML preview */}
        <div style={{ flex: '1 1 50%', background: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', background: '#fff', fontSize: '0.8rem', color: '#64748b' }}>
            תצוגה מקדימה
          </div>
          {htmlUrl ? (
            <iframe
              src={htmlUrl}
              style={{ width: '100%', height: 'calc(100% - 2.5rem)', border: 'none' }}
              title="תצוגה מקדימה"
            />
          ) : (
            <div style={{ padding: '2rem', color: '#94a3b8' }}>לא מחובר</div>
          )}
        </div>

        {/* Right: editable fields */}
        <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }} dir="rtl">ניקוד — {studentName}</h2>
            <button type="button" onClick={onClose} aria-label="סגור" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }} dir="rtl">
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
              לחצי על שדה לעריכה. לחצי "נקד" לניקוד אוטומטי. לחצי על כפתורי הניקוד להוספת תו בסמן.
            </p>

            {mainFields.map((f) => renderFieldBlock(f.key, f.label, f.multiline))}

            {commentFields.length > 0 && (
              <>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                  הערות לציונים
                </div>
                {commentFields.map((cf) => renderFieldBlock(`comment:${cf.subjectId}`, cf.subjectName))}
              </>
            )}

            {error && <Alert variant="error" className="mt-2">{error}</Alert>}
          </div>

          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>{he.cancel ?? 'ביטול'}</Button>
            <Button type="button" variant="primary" loading={saving} onClick={handleSave}>שמור</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
