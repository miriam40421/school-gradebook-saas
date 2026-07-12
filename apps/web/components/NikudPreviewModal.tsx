'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Wand2 } from 'lucide-react';
import type { CertificatePrefs, CertificateSupplementDto, CertificateSupplementSubjectDto } from '@school/shared';
import {
  CERTIFICATE_LABEL_DEFAULTS,
  CERTIFICATE_LABEL_DEFAULTS_NIKUD,
  CERTIFICATE_LABEL_DISPLAY_NAMES,
} from '@school/shared';
import { apiFetch, getToken } from '@/lib/api';
import { he } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { NikudPicker } from '@/components/NikudPicker';

// Keys that belong to the whole class (shared across all students)
const CLASS_NKO_KEYS = new Set(['class.name', 'term.name', 'class.cohort']);
const isClassNkoKey = (k: string) =>
  CLASS_NKO_KEYS.has(k) ||
  k.startsWith('category.') ||
  k.startsWith('subcategory.') ||
  k.startsWith('subject.');

type Props = {
  snapshotId: string;
  studentName: string;
  supplement: CertificateSupplementDto;
  classNikudOverrides: Record<string, string>;
  prefs: CertificatePrefs;
  subjects: CertificateSupplementSubjectDto[];
  gradeValues: Record<string, string>;
  customTextBlocks: Array<{ id: string; text: string }>;
  classInfo: { name: string; yearHebrew: string | null };
  termName: string;
  classId: string;
  termId: string;
  onClose: () => void;
  onAfterSave?: () => void;
};

const NIKUD_RE = /[ְ-ֽׁׂ]/;
const hasNikud = (text: string) => NIKUD_RE.test(text);
const isNumeric = (text: string) => /^\d+([./]\d+)?$/.test(text.trim());

function patchNativeValue(el: HTMLTextAreaElement | HTMLInputElement, next: string) {
  const proto = el instanceof HTMLTextAreaElement
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(el, next);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function insertAtCursor(el: HTMLTextAreaElement | HTMLInputElement, char: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  patchNativeValue(el, el.value.slice(0, start) + char + el.value.slice(end));
  requestAnimationFrame(() => {
    el.selectionStart = start + 1;
    el.selectionEnd = start + 1;
    el.focus();
  });
}

function deleteAtCursor(el: HTMLTextAreaElement | HTMLInputElement) {
  const pos = el.selectionStart ?? el.value.length;
  if (pos === 0) return;
  const text = el.value;
  let from = pos - 1;
  if (from > 0 && text.charCodeAt(from) >= 0xdc00 && text.charCodeAt(from) <= 0xdfff) from--;
  patchNativeValue(el, text.slice(0, from) + text.slice(pos));
  requestAnimationFrame(() => {
    el.selectionStart = from;
    el.selectionEnd = from;
    el.focus();
  });
}

function ScaledIframePreview({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.7);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setZoom(w / 794);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: '#f8fafc' }}>
      <iframe
        src={src}
        style={{ width: 794, height: 1500, border: 'none', display: 'block', zoom } as React.CSSProperties}
        title="תצוגה מקדימה"
      />
    </div>
  );
}

const LBL_PREFIX = 'lbl:';
const NKO_PREFIX = 'nko:';
const SERIF_FONT = 'var(--font-noto-serif-hebrew), "Noto Serif Hebrew", serif';

function initLabelValues(prefs: CertificatePrefs): Record<string, string> {
  const overrides = prefs.labelOverrides ?? {};
  const defaults = prefs.nikud ? CERTIFICATE_LABEL_DEFAULTS_NIKUD : CERTIFICATE_LABEL_DEFAULTS;
  const result: Record<string, string> = {};
  for (const key of Object.keys(CERTIFICATE_LABEL_DEFAULTS)) {
    result[`${LBL_PREFIX}${key}`] = overrides[key] ?? defaults[key] ?? '';
  }
  return result;
}

/** Extract unique categories in order from subjects list */
function extractCategories(subjects: CertificateSupplementSubjectDto[]) {
  const catOrder: string[] = [];
  const catMap = new Map<string, {
    id: string; label: string;
    subCats: Map<string, { id: string; label: string; subjects: CertificateSupplementSubjectDto[] }>;
    subjects: CertificateSupplementSubjectDto[];
  }>();

  for (const s of subjects) {
    if (!catMap.has(s.categoryId)) {
      catOrder.push(s.categoryId);
      catMap.set(s.categoryId, { id: s.categoryId, label: s.categoryLabel, subCats: new Map(), subjects: [] });
    }
    const cat = catMap.get(s.categoryId)!;
    if (s.subCategoryId && s.subCategoryLabel) {
      if (!cat.subCats.has(s.subCategoryId)) {
        cat.subCats.set(s.subCategoryId, { id: s.subCategoryId, label: s.subCategoryLabel, subjects: [] });
      }
      cat.subCats.get(s.subCategoryId)!.subjects.push(s);
    } else {
      cat.subjects.push(s);
    }
  }

  return catOrder.map((id) => catMap.get(id)!);
}

export function NikudPreviewModal({
  snapshotId,
  studentName,
  supplement,
  classNikudOverrides,
  prefs,
  subjects,
  gradeValues,
  customTextBlocks,
  classInfo,
  termName,
  classId,
  termId,
  onClose,
  onAfterSave,
}: Props) {
  const token = getToken();
  const htmlUrl = token
    ? `/api/html-preview/snapshot/${snapshotId}?token=${encodeURIComponent(token)}`
    : null;

  // per-student overrides only (class-level fields excluded)
  const nko = supplement.nikudOverrides ?? {};
  const categories = extractCategories(subjects);

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = { ...initLabelValues(prefs) };

    // Per-student identity
    init[`${NKO_PREFIX}student.fullName`] = nko['student.fullName'] ?? studentName;

    // Class-level identity (from classNikudOverrides)
    init[`${NKO_PREFIX}class.name`] = classNikudOverrides['class.name'] ?? classInfo.name;
    init[`${NKO_PREFIX}term.name`] = classNikudOverrides['term.name'] ?? termName;
    if (classInfo.yearHebrew) {
      init[`${NKO_PREFIX}class.cohort`] = classNikudOverrides['class.cohort'] ?? classInfo.yearHebrew;
    }

    // Category labels (class-level)
    for (const cat of categories) {
      init[`${NKO_PREFIX}category.${cat.id}`] = classNikudOverrides[`category.${cat.id}`] ?? cat.label;
      for (const sub of cat.subCats.values()) {
        init[`${NKO_PREFIX}subcategory.${sub.id}`] = classNikudOverrides[`subcategory.${sub.id}`] ?? sub.label;
      }
    }

    // Subject names (class-level) + grade values (per-student)
    for (const s of subjects) {
      init[`${NKO_PREFIX}subject.${s.id}`] = classNikudOverrides[`subject.${s.id}`] ?? s.name;
      const gv = gradeValues[s.id] ?? '';
      if (gv && !isNumeric(gv)) {
        init[`${NKO_PREFIX}grade.${s.id}`] = nko[`grade.${s.id}`] ?? gv;
      }
    }

    // Supplement fill fields
    if (prefs.evaluation) init['evaluation'] = supplement.evaluation ?? '';
    if (prefs.signatures !== false) {
      if (prefs.signatureHomeroom !== false) init['homeroomSignature'] = supplement.homeroomSignature ?? '';
      if (prefs.signaturePrincipal !== false) init['principalSignature'] = supplement.principalSignature ?? '';
    }
    if (prefs.commentPerGrade) {
      for (const s of subjects) {
        init[`comment:${s.id}`] = supplement.gradeComments?.[s.id] ?? '';
      }
    }

    // Custom template static_text blocks
    for (const block of customTextBlocks) {
      init[`${LBL_PREFIX}block.${block.id}`] = (prefs.labelOverrides ?? {})[`block.${block.id}`] ?? block.text;
    }

    return init;
  });

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [nikudLoading, setNikudLoading] = useState<string | null>(null);
  const [autoNikudRunning, setAutoNikudRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const inputRefs = useRef<Record<string, HTMLTextAreaElement | HTMLInputElement | null>>({});
  const initialLabelValues = useRef(initLabelValues(prefs));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Auto-nikud all un-nikud'd fields on first open
  useEffect(() => {
    if (!prefs.nikud) return;
    const fieldsToNikud: Array<[string, string]> = [];

    const addIfNeeded = (key: string, text: string) => {
      if (text.trim() && !isNumeric(text) && !hasNikud(text)) {
        fieldsToNikud.push([key, text]);
      }
    };

    addIfNeeded(`${NKO_PREFIX}student.fullName`, nko['student.fullName'] ?? studentName);
    addIfNeeded(`${NKO_PREFIX}class.name`, classNikudOverrides['class.name'] ?? classInfo.name);
    addIfNeeded(`${NKO_PREFIX}term.name`, classNikudOverrides['term.name'] ?? termName);
    if (classInfo.yearHebrew) {
      addIfNeeded(`${NKO_PREFIX}class.cohort`, classNikudOverrides['class.cohort'] ?? classInfo.yearHebrew);
    }
    for (const cat of categories) {
      addIfNeeded(`${NKO_PREFIX}category.${cat.id}`, classNikudOverrides[`category.${cat.id}`] ?? cat.label);
      for (const sub of cat.subCats.values()) {
        addIfNeeded(`${NKO_PREFIX}subcategory.${sub.id}`, classNikudOverrides[`subcategory.${sub.id}`] ?? sub.label);
      }
    }
    for (const s of subjects) {
      addIfNeeded(`${NKO_PREFIX}subject.${s.id}`, classNikudOverrides[`subject.${s.id}`] ?? s.name);
      const gv = gradeValues[s.id] ?? '';
      if (gv && !isNumeric(gv)) {
        addIfNeeded(`${NKO_PREFIX}grade.${s.id}`, nko[`grade.${s.id}`] ?? gv);
      }
    }
    if (prefs.evaluation && supplement.evaluation) {
      addIfNeeded('evaluation', supplement.evaluation);
    }
    if (prefs.signatures !== false) {
      if (prefs.signatureHomeroom !== false && supplement.homeroomSignature) {
        addIfNeeded('homeroomSignature', supplement.homeroomSignature);
      }
      if (prefs.signaturePrincipal !== false && supplement.principalSignature) {
        addIfNeeded('principalSignature', supplement.principalSignature);
      }
    }
    if (prefs.commentPerGrade) {
      for (const [sid, val] of Object.entries(supplement.gradeComments ?? {})) {
        if (val) addIfNeeded(`comment:${sid}`, val);
      }
    }
    for (const block of customTextBlocks) {
      const saved = (prefs.labelOverrides ?? {})[`block.${block.id}`];
      addIfNeeded(`${LBL_PREFIX}block.${block.id}`, saved ?? block.text);
    }

    if (fieldsToNikud.length === 0) return;

    // Snapshot of original (un-nikudified) texts — used to detect user edits that happen
    // while the async Dicta calls are in flight, so we don't overwrite them.
    const originalTexts = new Map<string, string>(fieldsToNikud);

    setAutoNikudRunning(true);
    void Promise.all(
      fieldsToNikud.map(async ([key, text]) => {
        try {
          const res = await apiFetch<{ result: string }>('/certificates/nikud-text', {
            method: 'POST',
            body: JSON.stringify({ text }),
          });
          return [key, res.result] as [string, string];
        } catch { return null; }
      }),
    ).then((results) => {
      setValues((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const r of results) {
          if (!r) continue;
          const [key, nikudValue] = r;
          // Skip update if user edited the field while API was in flight
          if (prev[key] !== originalTexts.get(key)) continue;
          next[key] = nikudValue;
          changed = true;
        }
        return changed ? next : prev;
      });
      setAutoNikudRunning(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoNikud = useCallback(async (key: string, text: string) => {
    if (!text.trim()) return;
    setNikudLoading(key);
    try {
      const res = await apiFetch<{ result: string }>('/certificates/nikud-text', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setValues((prev) => ({ ...prev, [key]: res.result }));
    } catch { /* ignore */ } finally { setNikudLoading(null); }
  }, []);

  const handleInsert = useCallback((char: string) => {
    if (!activeKey) return;
    const el = inputRefs.current[activeKey];
    if (!el) return;
    insertAtCursor(el, char);
    setValues((prev) => ({ ...prev, [activeKey]: el.value }));
  }, [activeKey]);

  const handleDelete = useCallback(() => {
    if (!activeKey) return;
    const el = inputRefs.current[activeKey];
    if (!el) return;
    deleteAtCursor(el);
    setValues((prev) => ({ ...prev, [activeKey]: el.value }));
  }, [activeKey]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // 1. Label overrides (green כלל הכיתה) — changed vs initial
      const changedLabels: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (k.startsWith(LBL_PREFIX)) {
          const labelKey = k.slice(LBL_PREFIX.length);
          if (v !== initialLabelValues.current[k]) changedLabels[labelKey] = v;
        }
      }

      // 2. Class-level nikud overrides (green כלל הכיתה — category/subject/class/term)
      const classNkoUpdates: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (k.startsWith(NKO_PREFIX)) {
          const nkoKey = k.slice(NKO_PREFIX.length);
          if (isClassNkoKey(nkoKey)) {
            if (v.trim()) classNkoUpdates[nkoKey] = v;
          }
        }
      }

      // 3. Per-student nikud overrides (blue לתלמידה זו)
      const perStudentNko: Record<string, string> = { ...nko };
      // clear old class-level keys that may have been stored per-student previously
      for (const k of Object.keys(perStudentNko)) {
        if (isClassNkoKey(k)) delete perStudentNko[k];
      }
      for (const [k, v] of Object.entries(values)) {
        if (k.startsWith(NKO_PREFIX)) {
          const nkoKey = k.slice(NKO_PREFIX.length);
          if (!isClassNkoKey(nkoKey)) {
            if (v.trim()) perStudentNko[nkoKey] = v;
            else delete perStudentNko[nkoKey];
          }
        }
      }

      const gradeComments: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(values)) {
        if (k.startsWith('comment:')) gradeComments[k.slice(8)] = v || null;
      }

      await Promise.all([
        Object.keys(changedLabels).length > 0
          ? apiFetch('/certificates/label-overrides', {
              method: 'PUT',
              body: JSON.stringify({ classId, overrides: changedLabels }),
            })
          : Promise.resolve(),
        Object.keys(classNkoUpdates).length > 0
          ? apiFetch('/certificates/nikud-class-overrides', {
              method: 'PUT',
              body: JSON.stringify({ classId, overrides: classNkoUpdates }),
            })
          : Promise.resolve(),
        apiFetch('/certificates/supplements', {
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
              nikudOverrides: Object.keys(perStudentNko).length ? perStudentNko : {},
            }],
          }),
        }),
      ]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIframeKey((k) => k + 1);
      onAfterSave?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירה');
    } finally { setSaving(false); }
  };

  const renderField = (key: string, label: string, multiline?: boolean, badge?: string) => {
    const val = values[key] ?? '';
    const isActive = activeKey === key;
    const loading = nikudLoading === key;
    const nkoKey = key.startsWith(NKO_PREFIX) ? key.slice(NKO_PREFIX.length) : null;
    const isClassLevel = key.startsWith(LBL_PREFIX) || (nkoKey !== null && isClassNkoKey(nkoKey));
    return (
      <div key={key} style={{ marginBottom: '0.55rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>{label}</label>
          {isClassLevel && (
            <span style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem', background: '#dcfce7', color: '#15803d', borderRadius: '0.9rem', border: '1px solid #bbf7d0', lineHeight: 1.4 }}>כלל הכיתה</span>
          )}
          {badge && !isClassLevel && (
            <span style={{ fontSize: '0.6rem', padding: '0.05rem 0.3rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '0.9rem', border: '1px solid #bae6fd', lineHeight: 1.4 }}>{badge}</span>
          )}
          <button
            type="button"
            title="ניקוד אוטומטי"
            disabled={loading || !val.trim()}
            onClick={() => autoNikud(key, val)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.68rem', padding: '0.08rem 0.35rem', border: '1px solid #cbd5e1', borderRadius: '0.3rem', background: '#f1f5f9', cursor: 'pointer', color: '#64748b' }}
          >
            <Wand2 style={{ width: 9, height: 9 }} />
            {loading ? '...' : 'נקד'}
          </button>
        </div>
        {multiline ? (
          <textarea
            ref={(el) => { inputRefs.current[key] = el; }}
            value={val}
            rows={2}
            onFocus={() => setActiveKey(key)}
            onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
            dir="rtl"
            style={{ width: '100%', resize: 'vertical', padding: '0.35rem', fontSize: '0.9rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontFamily: SERIF_FONT, lineHeight: 2 }}
          />
        ) : (
          <input
            ref={(el) => { inputRefs.current[key] = el; }}
            type="text"
            value={val}
            onFocus={() => setActiveKey(key)}
            onChange={(e) => setValues((p) => ({ ...p, [key]: e.target.value }))}
            dir="rtl"
            style={{ width: '100%', padding: '0.35rem', fontSize: '0.9rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontFamily: SERIF_FONT, lineHeight: 2 }}
          />
        )}
        {isActive && <NikudPicker onInsert={handleInsert} onDelete={handleDelete} />}
      </div>
    );
  };

  const lbl = (key: string) =>
    renderField(`${LBL_PREFIX}${key}`, CERTIFICATE_LABEL_DISPLAY_NAMES[key] ?? key);
  const nkoField = (nkoKey: string, label: string, multiline?: boolean) =>
    renderField(`${NKO_PREFIX}${nkoKey}`, label, multiline, isClassNkoKey(nkoKey) ? undefined : 'לתלמידה זו');

  const sec = (title: string) => (
    <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginTop: '0.7rem', marginBottom: '0.3rem', paddingBottom: '0.15rem', borderBottom: '1px solid #f1f5f9' }}>
      {title}
    </div>
  );

  const hasAttendance = prefs.absences || prefs.lateness || prefs.hourAbsences || prefs.hourLateness;
  const hasSignatures = prefs.signatures !== false && (
    prefs.signatureHomeroom !== false || prefs.signaturePrincipal !== false || prefs.signatureParent !== false
  );

  // Determine if any category has a subcategory
  const hasMultipleCategories = categories.length > 1 || categories.some(c => c.subCats.size > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`עריכת ניקוד — ${studentName}`}
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'stretch', background: 'rgba(15,23,42,0.6)' }}
      onClick={onClose}
    >
      <div
        style={{ display: 'flex', width: '100%', maxWidth: '68rem', margin: 'auto', background: '#fff', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.35)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: preview */}
        <div style={{ flex: '1 1 50%', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flexShrink: 0, padding: '0.6rem 1rem', borderBottom: '1px solid #e2e8f0', background: '#fff', fontSize: '0.78rem', color: '#64748b' }}>
            תצוגה מקדימה
          </div>
          {htmlUrl ? (
            <ScaledIframePreview key={iframeKey} src={`${htmlUrl}&_v=${iframeKey}`} />
          ) : (
            <div style={{ padding: '2rem', color: '#94a3b8' }}>לא מחובר</div>
          )}
        </div>

        {/* Right: editable fields */}
        <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '0.92rem', fontWeight: 700 }} dir="rtl">ניקוד — {studentName}</h2>
            <button type="button" onClick={onClose} aria-label="סגור" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }} dir="rtl">
            <p style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
              <span style={{ background: '#dcfce7', color: '#15803d', padding: '0 0.3rem', borderRadius: '0.5rem', fontSize: '0.62rem' }}>כלל הכיתה</span> — נשמר פעם אחת לכל התלמידות.{' '}
              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0 0.3rem', borderRadius: '0.5rem', fontSize: '0.62rem' }}>לתלמידה זו</span> — נשמר בנפרד לכל תלמידה.
            </p>
            {autoNikudRunning && (
              <p style={{ fontSize: '0.68rem', color: '#f59e0b', marginBottom: '0.4rem' }}>⏳ מנקד אוטומטית…</p>
            )}

            {/* 1. כותרת — only in built-in template path; custom templates render these as static_text blocks */}
            {customTextBlocks.length === 0 && (
              <>
                {sec('כותרת')}
                {lbl('besiata')}
                {lbl('title')}
              </>
            )}

            {/* 2. פרטי תלמידה — תוויות */}
            {sec('תוויות פרטי תלמידה')}
            {lbl('studentNameLabel')}
            {lbl('classLabel')}
            {lbl('termLabel')}
            {lbl('cohortLabel')}

            {/* 3. פרטי תלמידה — ערכים */}
            {sec('ערכים — פרטי תלמידה')}
            {nkoField('student.fullName', 'שם התלמידה')}
            {nkoField('class.name', 'שם הכיתה')}
            {nkoField('term.name', 'שם המחצית')}
            {classInfo.yearHebrew && nkoField('class.cohort', 'מחזור / שנה עברית')}

            {/* 4. ציונים — כותרת + עמודות */}
            {sec('כותרת ציונים')}
            {lbl('gradesSection')}
            {lbl('subject')}
            {lbl('grade')}
            {prefs.commentPerGrade && lbl('comment')}

            {/* 5. קטגוריות + מקצועות + ציונים — לפי סדר התעודה */}
            {categories.map((cat) => (
              <div key={cat.id}>
                {hasMultipleCategories && (
                  <>
                    {sec(`קטגוריה: ${cat.label}`)}
                    {renderField(`${NKO_PREFIX}category.${cat.id}`, `כותרת: ${cat.label}`, false, 'כלל הכיתה')}
                  </>
                )}

                {/* subcategories */}
                {Array.from(cat.subCats.values()).map((sub) => (
                  <div key={sub.id}>
                    {sec(`תת-קטגוריה: ${sub.label}`)}
                    {renderField(`${NKO_PREFIX}subcategory.${sub.id}`, `כותרת: ${sub.label}`, false, 'כלל הכיתה')}
                    {sub.subjects.map((s) => (
                      <div key={s.id}>
                        {renderField(`${NKO_PREFIX}subject.${s.id}`, `מקצוע: ${s.name}`, false, 'כלל הכיתה')}
                        {gradeValues[s.id] && !isNumeric(gradeValues[s.id]) &&
                          renderField(`${NKO_PREFIX}grade.${s.id}`, `ציון: ${s.name}`, false, 'לתלמידה זו')}
                        {prefs.commentPerGrade &&
                          renderField(`comment:${s.id}`, `הערה: ${s.name}`, false, 'לתלמידה זו')}
                      </div>
                    ))}
                  </div>
                ))}

                {/* direct subjects (no subcategory) */}
                {cat.subjects.map((s) => (
                  <div key={s.id}>
                    {renderField(`${NKO_PREFIX}subject.${s.id}`, `מקצוע: ${s.name}`, false, 'כלל הכיתה')}
                    {gradeValues[s.id] && !isNumeric(gradeValues[s.id]) &&
                      renderField(`${NKO_PREFIX}grade.${s.id}`, `ציון: ${s.name}`, false, 'לתלמידה זו')}
                    {prefs.commentPerGrade &&
                      renderField(`comment:${s.id}`, `הערה: ${s.name}`, false, 'לתלמידה זו')}
                  </div>
                ))}
              </div>
            ))}

            {/* 6. נוכחות */}
            {hasAttendance && (
              <>
                {sec('נוכחות')}
                {lbl('attendance')}
                {prefs.absences && lbl('absences')}
                {prefs.lateness && lbl('lateness')}
                {prefs.hourAbsences && lbl('hourAbsences')}
                {prefs.hourLateness && lbl('hourLateness')}
              </>
            )}

            {/* 7. הערכה */}
            {prefs.evaluation && (
              <>
                {sec('הערכה')}
                {lbl('evaluation')}
                {renderField('evaluation', 'טקסט הערכה', true, 'לתלמידה זו')}
              </>
            )}

            {/* 8. חתימות */}
            {hasSignatures && (
              <>
                {sec('חתימות')}
                {prefs.signatureHomeroom !== false && (
                  <>
                    {lbl('homeroomSig')}
                    {renderField('homeroomSignature', 'שם המחנכת', false, 'לתלמידה זו')}
                  </>
                )}
                {prefs.signaturePrincipal !== false && (
                  <>
                    {lbl('principalSig')}
                    {renderField('principalSignature', 'שם המנהלת', false, 'לתלמידה זו')}
                  </>
                )}
                {prefs.signatureParent !== false && lbl('parentSig')}
              </>
            )}

            {/* 9. תאריך */}
            {prefs.dateOnCertificate && (
              <>
                {sec('תאריך')}
                {lbl('date')}
              </>
            )}

            {/* 10. שורת תחתית */}
            {sec('שורת תחתית (נוצר)')}
            {lbl('generatedAt')}

            {/* 11. טקסטים מותאמים מהתבנית */}
            {customTextBlocks.length > 0 && (
              <>
                {sec('טקסטים מותאמים בתבנית')}
                {customTextBlocks.map((block) =>
                  renderField(`${LBL_PREFIX}block.${block.id}`, block.text.slice(0, 40))
                )}
              </>
            )}

            {error && <Alert variant="error" className="mt-2">{error}</Alert>}
          </div>

          <div style={{ padding: '0.6rem 1rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
            {saveSuccess && (
              <span style={{ fontSize: '0.8rem', color: '#16a34a', marginLeft: 'auto' }}>✓ נשמר</span>
            )}
            <Button type="button" variant="ghost" onClick={onClose}>{he.cancel ?? 'סגור'}</Button>
            <Button type="button" variant="primary" loading={saving} onClick={handleSave}>שמור</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
