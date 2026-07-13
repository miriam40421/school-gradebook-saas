'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { X } from 'lucide-react';
import { clampLayoutToPrintableArea, buildReadyCertificateLayout, normalizeLayoutAutoStack, normalizeLayoutDesignerPreview } from '@school/certificate-layout';
import { randomUUID } from '@/lib/uuid';
import { AdminShell } from '@/components/AdminShell';
import { CertificateTemplatePreview } from '@/components/CertificateTemplatePreview';
import { apiFetch, apiUpload, fetchAuthenticatedAssetBlob } from '@/lib/api';
import {
  canvasSizePx,
  designerGridBackground,
  mmToPx,
  printableAreaSizePx,
  pxToMm,
} from '@/lib/certificate-template-scale';
import type {
  AttendanceFieldKey,
  CertificatePrefs,
  CertificateProfileDto,
  CertificateSnapshotJsonV1,
  CertificateTemplateDetailDto,
  CertificateTemplateLayoutV1,
  CertificateTemplatePageV1,
  CertificatePageBackgroundImageMode,
  CertificatePageBackgroundImageFit,
  LayoutBlock,
  LayoutBlockType,
  SignatureFieldKey,
} from '@school/shared';
import {
  CERTIFICATE_FONT_FAMILIES,
  DesignerBlockPreview,
} from '@/lib/certificate-designer-block-preview';
import { computeCertificateGroupBorderOverlays } from '@/lib/certificate-group-borders.util';
import {
  computeDesignerBlockGroups,
  type DesignerBlockGroup,
} from '@/lib/certificate-designer-block-groups.util';
import {
  ATTENDANCE_FIELD_KEYS,
  DEFAULT_ATTENDANCE_FIELD_LABELS,
  DEFAULT_GRADES_TABLE_HEADER_LABELS,
  DEFAULT_SIGNATURE_FIELD_LABELS,
  SIGNATURE_FIELD_KEYS,
  certificateFillView,
  DEFAULT_CERTIFICATE_FONT_SIZE_PT,
  formatCertificateProfileLabel,
  normalizeCertificatePrefs,
  normalizeCertificateProfiles,
  normalizeCertificateTemplatePage,
  resolveCertificatePrefsForClass,
  resolveCertificateProfile,
  resolveProfileSubjects,
} from '@school/shared';
import { he, translateApiError } from '@/lib/he';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import {
  useCertificateLayoutHistory,
  type LayoutHistoryOptions,
} from '@/lib/use-certificate-layout-history';

const BLOCK_LABELS: Record<LayoutBlockType, string> = {
  static_text: 'טקסט קבוע',
  logo: 'לוגו',
  field: 'שדה דינמי',
  header_meta_row: 'שורת פרטי תלמידה',
  grades_table: 'טבלת ציונים',
  attendance: 'נוכחות (בלוק כולל)',
  attendance_field: 'שדה נוכחות',
  evaluation: 'הערכה',
  signatures: 'חתימות + תאריך (בלוק כולל)',
  signature_field: 'שדה חתימה',
  date: 'תאריך',
};

const PALETTE_CORE_TYPES: LayoutBlockType[] = [
  'static_text',
  'logo',
  'header_meta_row',
  'field',
  'grades_table',
  'evaluation',
];

const PALETTE_COMPOSITE_TYPES = ['attendance', 'signatures'] as const;

const GROUP_HANDLE_MM = 7;

type GradingSetTypeRow = { id: string; label: string; parentId: string | null };

function buildDesignerPreviewSnapshot(prefsInput: CertificatePrefs): CertificateSnapshotJsonV1 {
  const prefs = normalizeCertificatePrefs(prefsInput);
  const hasEvaluation = Boolean(prefs.evaluation || prefs.homeroomComment);
  const showAnyGradeComment = Boolean(prefs.commentPerGrade);
  return {
    schemaVersion: 1,
    templateKey: 'custom',
    generatedAt: new Date().toISOString(),
    school: { id: 'demo', name: 'בית ספר לדוגמה' },
    class: { id: 'c', name: 'ג׳1', year: 2025 },
    term: { id: 't', name: 'מחצית א׳' },
    student: { id: 's', fullName: 'תלמידה לדוגמה' },
    evaluation: hasEvaluation
      ? 'שורת הערכה לדוגמה. טקסט זה משמש להצגת גובה בלוק ההערכה במעצב.'
      : null,
    fill: certificateFillView(prefs),
    certificatePrefs: prefs,
    showAnyGradeComment,
    subjects: [
      {
        subjectId: 'demo-1',
        subjectName: 'מתמטיקה',
        value: 'טוב',
        categoryId: 'c1',
        categoryLabel: 'לימודי חול',
        showComment: showAnyGradeComment,
      },
      {
        subjectId: 'demo-2',
        subjectName: 'אנגלית',
        value: 'מצוין',
        categoryId: 'c1',
        categoryLabel: 'לימודי חול',
        showComment: showAnyGradeComment,
      },
    ],
    subjectCategories: [
      {
        categoryId: 'c1',
        categoryLabel: 'לימודי חול',
        showComment: showAnyGradeComment,
        subjects: [
          {
            subjectId: 'demo-1',
            subjectName: 'מתמטיקה',
            value: 'טוב',
            categoryId: 'c1',
            categoryLabel: 'לימודי חול',
            showComment: showAnyGradeComment,
          },
          {
            subjectId: 'demo-2',
            subjectName: 'אנגלית',
            value: 'מצוין',
            categoryId: 'c1',
            categoryLabel: 'לימודי חול',
            showComment: showAnyGradeComment,
          },
        ],
      },
    ],
  };
}

function defaultBlock(type: LayoutBlockType): LayoutBlock {
  const base = {
    id: randomUUID(),
    box: { xMm: 0, yMm: 0, wMm: 80, hMm: 20 },
    style: {
      fontFamily: 'Arial',
      fontSizePt: DEFAULT_CERTIFICATE_FONT_SIZE_PT,
      fontWeight: 'normal' as const,
      color: '#1e293b',
      textAlign: 'right' as const,
      backgroundColor: 'transparent',
    },
  };
  switch (type) {
    case 'static_text':
      return { ...base, type, props: { text: 'טקסט' } };
    case 'logo':
      return {
        ...base,
        type,
        box: { xMm: 0, yMm: 0, wMm: 40, hMm: 40 },
        props: { storageKey: null, objectFit: 'contain' },
      };
    case 'field':
      return { ...base, type, props: { fieldKey: 'studentName' } };
    case 'header_meta_row':
      return {
        ...base,
        type,
        box: { xMm: 0, yMm: 38, wMm: 190, hMm: 12 },
        props: {},
      };
    case 'grades_table':
      return {
        ...base,
        type,
        box: { xMm: 0, yMm: 30, wMm: 190, hMm: 100 },
        props: {
          showHeader: true,
          headerLabels: { ...DEFAULT_GRADES_TABLE_HEADER_LABELS },
        },
      };
    case 'attendance':
      return {
        ...base,
        type,
        box: { xMm: 0, yMm: 0, wMm: 190, hMm: 14 },
        style: { ...base.style, textAlign: 'center' as const },
        props: {
          showAbsences: true,
          showLateness: true,
          showHourAbsences: true,
          showHourLateness: true,
        },
      };
    case 'attendance_field':
      return {
        ...base,
        type,
        box: { xMm: 0, yMm: 0, wMm: 55, hMm: 10 },
        props: {
          fieldKey: 'absences',
          label: DEFAULT_ATTENDANCE_FIELD_LABELS.absences,
        },
      };
    case 'evaluation':
      return { ...base, type, props: { title: 'הערכה' } };
    case 'signatures':
      return {
        ...base,
        type,
        box: { xMm: 0, yMm: 200, wMm: 190, hMm: 40 },
        props: {
          labels: {
            homeroom: 'חתימת המחנכת',
            principal: 'חתימת המנהלת',
            parent: 'חתימת ההורים',
          },
        },
      };
    case 'signature_field':
      return {
        ...base,
        type,
        box: { xMm: 0, yMm: 0, wMm: 60, hMm: 18 },
        props: {
          signatureKey: 'homeroom',
          label: DEFAULT_SIGNATURE_FIELD_LABELS.homeroom,
        },
      };
    case 'date':
      return { ...base, type, props: { format: 'hebrew' } };
  }
}

function defaultGradesTableBlock(categoryId?: string | null): LayoutBlock {
  const base = defaultBlock('grades_table');
  if (base.type !== 'grades_table') return base;
  return {
    ...base,
    props: {
      ...base.props,
      categoryId: categoryId ?? null,
      showCategoryTitle: !categoryId,
    },
  };
}

function defaultAttendanceFieldBlock(fieldKey: AttendanceFieldKey): LayoutBlock {
  const base = defaultBlock('attendance_field');
  if (base.type !== 'attendance_field') return base;
  return {
    ...base,
    props: {
      fieldKey,
      label: DEFAULT_ATTENDANCE_FIELD_LABELS[fieldKey],
    },
  };
}

function defaultSignatureFieldBlock(signatureKey: SignatureFieldKey): LayoutBlock {
  const base = defaultBlock('signature_field');
  if (base.type !== 'signature_field') return base;
  return {
    ...base,
    props: {
      signatureKey,
      label: DEFAULT_SIGNATURE_FIELD_LABELS[signatureKey],
    },
  };
}

export default function CertificateTemplateEditPage() {
  const params = useParams();
  const id = String(params.id);
  const qc = useQueryClient();
  const {
    layout,
    setLayout,
    resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCertificateLayoutHistory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<
    DesignerBlockGroup['id'] | null
  >(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewProfileId, setPreviewProfileId] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMessage, setLogoMessage] = useState<string | null>(null);
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [backgroundMessage, setBackgroundMessage] = useState<string | null>(null);
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState<string | null>(null);
  const [wizardMessage, setWizardMessage] = useState<string | null>(null);
  const [confirmWizard, setConfirmWizard] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['certificate-template', id],
    queryFn: () => apiFetch<CertificateTemplateDetailDto>(`/certificate-templates/${id}`),
    enabled: Boolean(id),
  });

  const { data: schoolData } = useQuery({
    queryKey: ['school'],
    queryFn: () =>
      apiFetch<{ settingsJson: Record<string, unknown> }>('/school'),
  });

  const { data: gradingSetTypes = [] } = useQuery({
    queryKey: ['grading-set-types'],
    queryFn: () => apiFetch<GradingSetTypeRow[]>('/grading-set-types'),
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiFetch<{ id: string; gradingSetTypeId: string }[]>('/subjects'),
  });

  const certProfiles = useMemo(() => {
    const normalized = normalizeCertificateProfiles(schoolData?.settingsJson);
    return normalized.profiles;
  }, [schoolData?.settingsJson]);

  useEffect(() => {
    if (previewProfileId === null && certProfiles.length > 0) {
      const linkedProfile = certProfiles.find((p) => p.templateId === id);
      if (linkedProfile) {
        setPreviewProfileId(linkedProfile.id);
        return;
      }
      const { defaultProfileId } = normalizeCertificateProfiles(schoolData?.settingsJson);
      setPreviewProfileId(defaultProfileId ?? certProfiles[0]?.id ?? null);
    }
  }, [certProfiles, previewProfileId, schoolData?.settingsJson, id]);

  const previewPrefs = useMemo(
    () =>
      normalizeCertificatePrefs(
        resolveCertificatePrefsForClass(schoolData?.settingsJson, previewProfileId),
      ),
    [schoolData?.settingsJson, previewProfileId],
  );

  const previewProfileName = useMemo(
    () => certProfiles.find((p) => p.id === previewProfileId)?.name ?? null,
    [certProfiles, previewProfileId],
  );

  const parentCategories = useMemo(
    () => gradingSetTypes.filter((t) => !t.parentId),
    [gradingSetTypes],
  );

  const categoryById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of gradingSetTypes) map.set(t.id, t.label);
    return map;
  }, [gradingSetTypes]);

  useEffect(() => {
    if (data?.layoutJson && layout === null) {
      resetHistory(clampLayoutToPrintableArea(data.layoutJson));
    }
  }, [data?.layoutJson, layout, resetHistory]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!layout) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [layout, undo, redo]);

  const effectiveLayout = useMemo(() => {
    if (layout) return layout;
    if (data?.layoutJson) return clampLayoutToPrintableArea(data.layoutJson);
    return null;
  }, [layout, data?.layoutJson]);

  const orientation = data?.orientation ?? effectiveLayout?.page.orientation ?? 'portrait';
  const canvas = canvasSizePx(orientation);

  const designerSnapshot = useMemo(
    () => buildDesignerPreviewSnapshot(previewPrefs),
    [previewPrefs],
  );

  const canvasLayout = useMemo(() => {
    if (!effectiveLayout) return null;
    return normalizeLayoutDesignerPreview(effectiveLayout, designerSnapshot);
  }, [effectiveLayout, designerSnapshot]);

  const designerPreviewBlocks = useMemo(() => {
    if (!effectiveLayout) return [];
    const previewLayout = canvasLayout ?? effectiveLayout;
    const persistedIds = new Set(effectiveLayout.blocks.map((b) => b.id));
    return previewLayout.blocks.map((block) => ({
      block,
      isInjected: !persistedIds.has(block.id),
    }));
  }, [effectiveLayout, canvasLayout]);

  const pageSettings = useMemo(
    () => (effectiveLayout ? normalizeCertificateTemplatePage(effectiveLayout.page) : null),
    [effectiveLayout],
  );

  const displayBlockBox = useCallback(
    (blockId: string) => {
      const persisted = effectiveLayout?.blocks.find((b) => b.id === blockId);
      if (persisted) return persisted.box;
      const injected = canvasLayout?.blocks.find((b) => b.id === blockId);
      return injected?.box ?? { xMm: 0, yMm: 0, wMm: 10, hMm: 10 };
    },
    [canvasLayout, effectiveLayout],
  );

  const groupBorderOverlays = useMemo(() => {
    if (!canvasLayout) return [];
    return computeCertificateGroupBorderOverlays(
      canvasLayout.blocks,
      previewPrefs,
      displayBlockBox,
    );
  }, [canvasLayout, previewPrefs, displayBlockBox]);

  const designerBlockGroups = useMemo(() => {
    if (!effectiveLayout) return [];
    return computeDesignerBlockGroups(effectiveLayout, displayBlockBox);
  }, [effectiveLayout, displayBlockBox]);

  const selectedGroup = useMemo(
    () => designerBlockGroups.find((g) => g.id === selectedGroupId) ?? null,
    [designerBlockGroups, selectedGroupId],
  );

  const groupStyleSource = useMemo(() => {
    if (!effectiveLayout || !selectedGroup) return null;
    return (
      effectiveLayout.blocks.find((b) => selectedGroup.blockIds.includes(b.id)) ?? null
    );
  }, [effectiveLayout, selectedGroup]);

  const selectedFieldGroup = useMemo(() => {
    if (!selectedId) return null;
    return designerBlockGroups.find((g) => g.blockIds.includes(selectedId)) ?? null;
  }, [designerBlockGroups, selectedId]);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedGroupId(null);
  }, []);

  const selectBlock = useCallback((blockId: string) => {
    setSelectedId(blockId);
    setSelectedGroupId(null);
  }, []);

  const selectGroup = useCallback((groupId: DesignerBlockGroup['id']) => {
    setSelectedGroupId(groupId);
    setSelectedId(null);
  }, []);

  const updateGroupBlockStyle = useCallback(
    (group: DesignerBlockGroup, stylePatch: Partial<LayoutBlock['style']>) => {
      if (!effectiveLayout) return;
      const ids = new Set(group.blockIds);
      setLayout(
        {
          ...effectiveLayout,
          blocks: effectiveLayout.blocks.map((block) =>
            ids.has(block.id)
              ? { ...block, style: { ...block.style, ...stylePatch } }
              : block,
          ),
        },
        { immediate: true },
      );
    },
    [effectiveLayout, setLayout],
  );

  const setAttendanceFieldVisible = useCallback(
    (fieldKey: AttendanceFieldKey, visible: boolean) => {
      if (!effectiveLayout) return;
      const existing = effectiveLayout.blocks.find(
        (b) => b.type === 'attendance_field' && b.props.fieldKey === fieldKey,
      );
      if (visible) {
        if (existing) return;
        const group = designerBlockGroups.find((g) => g.id === 'attendance-group');
        const block = defaultAttendanceFieldBlock(fieldKey);
        if (group) {
          block.box = {
            ...block.box,
            yMm: group.box.yMm,
            hMm: group.box.hMm,
          };
        }
        setLayout(
          { ...effectiveLayout, blocks: [...effectiveLayout.blocks, block] },
          { immediate: true },
        );
        return;
      }
      if (existing) {
        setLayout(
          {
            ...effectiveLayout,
            blocks: effectiveLayout.blocks.filter((b) => b.id !== existing.id),
          },
          { immediate: true },
        );
      }
    },
    [effectiveLayout, designerBlockGroups, setLayout],
  );

  const groupHandleDragRef = useRef<{ groupId: string; startX: number; startY: number } | null>(
    null,
  );
  const canvasHostRef = useRef<HTMLDivElement>(null);

  const moveBlockGroup = useCallback(
    (group: DesignerBlockGroup, dxMm: number, dyMm: number) => {
      if (!effectiveLayout || (dxMm === 0 && dyMm === 0)) return;
      setLayout(
        {
          ...effectiveLayout,
          blocks: effectiveLayout.blocks.map((block) =>
            group.blockIds.includes(block.id)
              ? {
                  ...block,
                  box: {
                    ...block.box,
                    xMm: Math.round((block.box.xMm + dxMm) * 10) / 10,
                    yMm: Math.round((block.box.yMm + dyMm) * 10) / 10,
                  },
                }
              : block,
          ),
        },
        { immediate: true },
      );
    },
    [effectiveLayout, setLayout],
  );

  useEffect(() => {
    const key = pageSettings?.backgroundImageStorageKey;
    if (!key) {
      setBackgroundPreviewUrl(null);
      return;
    }
    let revoked: string | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const blob = await fetchAuthenticatedAssetBlob(
          `/certificate-templates/${id}/asset?key=${encodeURIComponent(key)}`,
        );
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setBackgroundPreviewUrl(url);
      } catch {
        if (!cancelled) setBackgroundPreviewUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [id, pageSettings?.backgroundImageStorageKey]);

  const printablePx = effectiveLayout ? printableAreaSizePx(effectiveLayout) : null;
  const paddingPx = effectiveLayout
    ? {
        top: mmToPx(effectiveLayout.page.paddingMm.top),
        right: mmToPx(effectiveLayout.page.paddingMm.right),
        bottom: mmToPx(effectiveLayout.page.paddingMm.bottom),
        left: mmToPx(effectiveLayout.page.paddingMm.left),
      }
    : null;
  const selected = effectiveLayout?.blocks.find((b) => b.id === selectedId) ?? null;
  const propertiesStyleBlock = selected ?? groupStyleSource;

  const save = useMutation({
    mutationFn: () => {
      const stacked = effectiveLayout
        ? normalizeLayoutDesignerPreview(effectiveLayout, designerSnapshot)
        : effectiveLayout;
      const normalized = stacked ? clampLayoutToPrintableArea(stacked) : stacked;
      return apiFetch<CertificateTemplateDetailDto>(`/certificate-templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ layoutJson: normalized }),
      });
    },
    onSuccess: (updated) => {
      if (updated.layoutJson) {
        resetHistory(clampLayoutToPrintableArea(updated.layoutJson));
      }
      void qc.invalidateQueries({ queryKey: ['certificate-template', id] });
      void qc.invalidateQueries({ queryKey: ['certificate-templates'] });
    },
  });

  const updateBlock = useCallback(
    (blockId: string, patch: Partial<LayoutBlock>, options?: LayoutHistoryOptions) => {
      if (!effectiveLayout) return;
      setLayout(
        {
          ...effectiveLayout,
          blocks: effectiveLayout.blocks.map((b) =>
            b.id === blockId ? ({ ...b, ...patch } as LayoutBlock) : b,
          ),
        },
        options,
      );
    },
    [effectiveLayout, setLayout],
  );

  const updateSignatureGroupLabel = useCallback(
    (signatureKey: SignatureFieldKey, label: string) => {
      if (!effectiveLayout) return;
      const block = effectiveLayout.blocks.find(
        (b) => b.type === 'signature_field' && b.props.signatureKey === signatureKey,
      );
      if (!block || block.type !== 'signature_field') return;
      updateBlock(block.id, {
        props: { ...block.props, label },
      } as Partial<LayoutBlock>);
    },
    [effectiveLayout, updateBlock],
  );

  const updatePage = useCallback(
    (patch: Partial<CertificateTemplatePageV1>, options?: LayoutHistoryOptions) => {
      if (!effectiveLayout) return;
      setLayout(
        {
          ...effectiveLayout,
          page: { ...effectiveLayout.page, ...patch },
        },
        options,
      );
    },
    [effectiveLayout, setLayout],
  );

  const addBlock = (type: LayoutBlockType) => {
    if (!effectiveLayout) return;
    const block = defaultBlock(type);
    setLayout(
      { ...effectiveLayout, blocks: [...effectiveLayout.blocks, block] },
      { immediate: true },
    );
    selectBlock(block.id);
  };

  const addCompositeBlock = (type: 'attendance' | 'signatures') => {
    if (!effectiveLayout) return;
    const existing = effectiveLayout.blocks.find((b) => b.type === type);
    if (existing) {
      selectBlock(existing.id);
      return;
    }
    addBlock(type);
  };

  const addGradesTableForCategory = (categoryId: string) => {
    if (!effectiveLayout) return;
    const block = defaultGradesTableBlock(categoryId);
    setLayout(
      { ...effectiveLayout, blocks: [...effectiveLayout.blocks, block] },
      { immediate: true },
    );
    selectBlock(block.id);
  };

  const addAttendanceField = (fieldKey: AttendanceFieldKey) => {
    if (!effectiveLayout) return;
    const block = defaultAttendanceFieldBlock(fieldKey);
    setLayout(
      { ...effectiveLayout, blocks: [...effectiveLayout.blocks, block] },
      { immediate: true },
    );
    selectBlock(block.id);
  };

  const addSignatureField = (signatureKey: SignatureFieldKey) => {
    if (!effectiveLayout) return;
    const block = defaultSignatureFieldBlock(signatureKey);
    setLayout(
      { ...effectiveLayout, blocks: [...effectiveLayout.blocks, block] },
      { immediate: true },
    );
    selectBlock(block.id);
  };

  const removeBlock = (blockId: string) => {
    if (!effectiveLayout) return;
    setLayout(
      {
        ...effectiveLayout,
        blocks: effectiveLayout.blocks.filter((b) => b.id !== blockId),
      },
      { immediate: true },
    );
    if (selectedId === blockId) clearSelection();
  };

  const applyReadyCertificateWizard = () => {
    if (!effectiveLayout) return;
    if (effectiveLayout.blocks.length > 0) {
      setConfirmWizard(true);
      return;
    }
    doApplyWizard();
  };

  const doApplyWizard = () => {
    if (!effectiveLayout) return;
    setConfirmWizard(false);
    // Only include parent categories that have at least one subject in the current profile
    const currentProfile = resolveCertificateProfile(schoolData?.settingsJson, previewProfileId);
    const profileSubjects = resolveProfileSubjects(currentProfile, allSubjects);
    const profileSubjectTypeIds = new Set(profileSubjects.map((s) => s.gradingSetTypeId));
    // Map subject gradingSetTypeId → parent category id (type may be a child)
    const typeToParent = new Map(
      gradingSetTypes.map((t) => [t.id, t.parentId ?? t.id]),
    );
    const activeCategoryIds = new Set(
      [...profileSubjectTypeIds].map((tid) => typeToParent.get(tid) ?? tid),
    );
    const categoryIds = parentCategories
      .filter((c) => activeCategoryIds.has(c.id))
      .map((c) => c.id);
    const wizardLayout = buildReadyCertificateLayout({
      orientation: effectiveLayout.page.orientation,
      categoryIds,
      prefs: previewPrefs,
      baseLayout: { page: effectiveLayout.page },
      createId: randomUUID,
    });
    const existingLogo = effectiveLayout.blocks.find((b) => b.type === 'logo');
    if (existingLogo?.type === 'logo' && existingLogo.props.storageKey) {
      const logoBlock = wizardLayout.blocks.find((b) => b.type === 'logo');
      if (logoBlock && logoBlock.type === 'logo') {
        logoBlock.props = { ...logoBlock.props, storageKey: existingLogo.props.storageKey };
      }
    }
    const clamped = clampLayoutToPrintableArea(
      normalizeLayoutAutoStack(wizardLayout, designerSnapshot),
    );
    setLayout(clamped, { immediate: true });
    clearSelection();
    setWizardMessage(he.certTemplatesWizardApplied);
  };

  const blockLabel = useMemo(() => {
    if (selectedGroup) return selectedGroup.label;
    if (!selected) return null;
    return BLOCK_LABELS[selected.type];
  }, [selected, selectedGroup]);

  const signatureFieldLabel = useCallback(
    (signatureKey: SignatureFieldKey) => {
      if (!effectiveLayout) return DEFAULT_SIGNATURE_FIELD_LABELS[signatureKey];
      const block = effectiveLayout.blocks.find(
        (b) => b.type === 'signature_field' && b.props.signatureKey === signatureKey,
      );
      return block?.type === 'signature_field'
        ? block.props.label
        : DEFAULT_SIGNATURE_FIELD_LABELS[signatureKey];
    },
    [effectiveLayout],
  );

  const uploadBackground = async (file: File) => {
    setBackgroundUploading(true);
    setBackgroundMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await apiUpload<{ storageKey: string }>(
        `/certificate-templates/${id}/background`,
        form,
      );
      updatePage(
        {
          backgroundImageStorageKey: result.storageKey,
          backgroundImageMode:
            pageSettings?.backgroundImageMode === 'none' || !pageSettings?.backgroundImageMode
              ? 'full'
              : pageSettings.backgroundImageMode,
        },
        { immediate: true },
      );
      const localUrl = URL.createObjectURL(file);
      setBackgroundPreviewUrl((prev) => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return localUrl;
      });
      setBackgroundMessage(he.certTemplatesBackgroundUploaded);
    } catch (err) {
      setBackgroundMessage(translateApiError(err instanceof Error ? err.message : 'Failed'));
    } finally {
      setBackgroundUploading(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    setLogoMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await apiUpload<{ storageKey: string }>(
        `/certificate-templates/${id}/logo`,
        form,
      );
      if (selected?.type === 'logo') {
        updateBlock(
          selected.id,
          {
            props: { ...selected.props, storageKey: result.storageKey },
          } as Partial<LayoutBlock>,
          { immediate: true },
        );
      } else if (effectiveLayout) {
        const logoBlock = effectiveLayout.blocks.find((b) => b.type === 'logo');
        if (logoBlock && logoBlock.type === 'logo') {
          updateBlock(
            logoBlock.id,
            {
              props: { ...logoBlock.props, storageKey: result.storageKey },
            } as Partial<LayoutBlock>,
            { immediate: true },
          );
        }
      }
      setLogoMessage(he.certTemplatesLogoUploaded);
    } catch (err) {
      setLogoMessage(translateApiError(err instanceof Error ? err.message : 'Failed'));
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <AdminShell>
      <p className="mb-4">
        <Link href="/certificate-templates" className="text-sm font-medium text-primary no-underline hover:underline">
          ← {he.certTemplatesTitle}
        </Link>
      </p>
      <PageHeader
        title={`${data?.name ?? he.loading} — ${he.certTemplatesEdit}`}
        description={
          data
            ? `${he.certTemplatesLayoutVersion(data.layoutVersion)} · ${
                orientation === 'landscape'
                  ? he.certTemplatesLandscape
                  : he.certTemplatesPortrait
              }`
            : undefined
        }
      />

      {isLoading && <Spinner label={he.loading} />}
      {error && <Alert variant="error">{translateApiError((error as Error).message)}</Alert>}

      {effectiveLayout && (
        <div className="flex min-w-0 flex-col gap-2 overflow-x-auto md:flex-row md:items-start md:gap-2">
          <aside className="order-3 w-full shrink-0 space-y-1.5 md:order-1 md:max-h-[calc(100vh-5rem)] md:w-[168px] md:max-w-[168px] md:overflow-y-auto">
            <Card className="!p-2">
              <h3 className="mb-2 text-xs font-semibold text-text">{he.certTemplatesDesignerToolbar}</h3>
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" variant="secondary" size="sm" disabled={!canUndo} onClick={() => undo()}>
                  ↶ {he.certTemplatesUndo}
                </Button>
                <Button type="button" variant="secondary" size="sm" disabled={!canRedo} onClick={() => redo()}>
                  ↷ {he.certTemplatesRedo}
                </Button>
                <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
                  {he.certTemplatesSaveLayout}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowPreview(true)}>
                  {he.certTemplatesPreview}
                </Button>
              </div>
              {certProfiles.length > 0 && (
                <div className="mt-3">
                  <Label htmlFor="preview-profile">{he.certTemplatesPreviewProfile}</Label>
                  <select
                    id="preview-profile"
                    value={previewProfileId ?? ''}
                    onChange={(e) => setPreviewProfileId(e.target.value || null)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {certProfiles.map((p: CertificateProfileDto) => (
                      <option key={p.id} value={p.id}>
                        {formatCertificateProfileLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {save.error && (
                <Alert variant="error" className="mt-3">
                  {translateApiError((save.error as Error).message)}
                </Alert>
              )}
              {save.isSuccess && (
                <p className="mt-2 text-sm text-emerald-700">{he.saved}</p>
              )}
            </Card>

            <Card className="!p-2 border border-sky-100 bg-sky-50/60">
              <h3 className="mb-1 text-xs font-semibold text-sky-900">{he.certTemplatesSectionWizard}</h3>
              <p className="mb-2 text-[11px] leading-snug text-sky-800">{he.certTemplatesWizardHint}</p>
              {!confirmWizard ? (
                <Button type="button" size="sm" onClick={applyReadyCertificateWizard}>
                  {he.certTemplatesWizard}
                </Button>
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] text-amber-800">{he.certTemplatesWizardConfirm}</p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="primary" onClick={doApplyWizard}>
                      {he.confirmYes ?? 'כן'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmWizard(false)}>
                      {he.confirmNo ?? 'ביטול'}
                    </Button>
                  </div>
                </div>
              )}
              {wizardMessage && (
                <p className="mt-2 text-xs text-emerald-700">{wizardMessage}</p>
              )}
            </Card>

            <Card className="!p-2">
              <h3 className="mb-1.5 text-xs font-semibold text-text">{he.certTemplatesPageSettings}</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <Label>{he.certTemplatesPageBackgroundColor}</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={pageSettings?.backgroundColor ?? '#ffffff'}
                      onChange={(e) =>
                        updatePage({ backgroundColor: e.target.value }, { immediate: true })
                      }
                      className="h-9 w-12 cursor-pointer rounded border border-slate-200"
                    />
                    <input
                      type="text"
                      value={pageSettings?.backgroundColor ?? '#ffffff'}
                      onChange={(e) => updatePage({ backgroundColor: e.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label>{he.certTemplatesUploadBackground}</Label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    disabled={backgroundUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadBackground(file);
                      e.target.value = '';
                    }}
                    className="mt-1 block w-full text-xs"
                  />
                </div>
                {pageSettings?.backgroundImageStorageKey && (
                  <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                    <div>
                      <Label>{he.certTemplatesBackgroundMode}</Label>
                      <select
                        value={pageSettings.backgroundImageMode}
                        onChange={(e) =>
                          updatePage({
                            backgroundImageMode: e.target.value as CertificatePageBackgroundImageMode,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
                      >
                        <option value="none">{he.certTemplatesBackgroundModeNone}</option>
                        <option value="full">{he.certTemplatesBackgroundModeFull}</option>
                        <option value="corner">{he.certTemplatesBackgroundModeCorner}</option>
                      </select>
                    </div>
                    <div>
                      <Label>{he.certTemplatesBackgroundFit}</Label>
                      <select
                        value={pageSettings.backgroundImageFit}
                        onChange={(e) =>
                          updatePage({
                            backgroundImageFit: e.target.value as CertificatePageBackgroundImageFit,
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5"
                      >
                        <option value="cover">{he.certTemplatesBackgroundFitCover}</option>
                        <option value="contain">{he.certTemplatesBackgroundFitContain}</option>
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        updatePage(
                          { backgroundImageStorageKey: null, backgroundImageMode: 'none' },
                          { immediate: true },
                        )
                      }
                    >
                      {he.certTemplatesRemoveBackground}
                    </Button>
                  </div>
                )}
                {backgroundMessage && (
                  <p className="text-xs text-text-muted">{backgroundMessage}</p>
                )}
              </div>
            </Card>

            <Card className="!p-2">
              <h3 className="mb-1.5 text-xs font-semibold text-text">{he.certTemplatesSectionBlocks}</h3>
              <div className="max-h-[200px] space-y-2 overflow-y-auto pr-0.5 text-[11px]">
                <div>
                  <p className="mb-1 font-medium text-text-muted">{he.certTemplatesSectionBasicBlocks}</p>
                  <div className="flex flex-col gap-0.5">
                    {PALETTE_CORE_TYPES.map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 w-full justify-start px-2 text-xs"
                        onClick={() => addBlock(type)}
                      >
                        + {BLOCK_LABELS[type]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 font-medium text-text-muted">{he.certTemplatesCompositeBlocks}</p>
                  <div className="flex flex-col gap-0.5">
                    {PALETTE_COMPOSITE_TYPES.map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 w-full justify-start px-2 text-xs"
                        onClick={() => addCompositeBlock(type)}
                      >
                        + {BLOCK_LABELS[type]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 font-medium text-text-muted">{he.certTemplatesAttendanceFields}</p>
                  <div className="flex flex-col gap-0.5">
                    {ATTENDANCE_FIELD_KEYS.map((key) => (
                      <Button
                        key={key}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 w-full justify-start px-2 text-xs"
                        onClick={() => addAttendanceField(key)}
                      >
                        + {DEFAULT_ATTENDANCE_FIELD_LABELS[key]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 font-medium text-text-muted">{he.certTemplatesSignatureFields}</p>
                  <div className="flex flex-col gap-0.5">
                    {SIGNATURE_FIELD_KEYS.map((key) => (
                      <Button
                        key={key}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 w-full justify-start px-2 text-xs"
                        onClick={() => addSignatureField(key)}
                      >
                        + {DEFAULT_SIGNATURE_FIELD_LABELS[key]}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 w-full justify-start px-2 text-xs"
                      onClick={() => addBlock('date')}
                    >
                      + {BLOCK_LABELS.date}
                    </Button>
                  </div>
                </div>
                {parentCategories.length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-text-muted">
                      {he.certTemplatesGradesTablePerCategory}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {parentCategories.map((cat) => (
                        <Button
                          key={cat.id}
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-7 w-full justify-start px-2 text-xs"
                          onClick={() => addGradesTableForCategory(cat.id)}
                        >
                          + {he.certTemplatesGradesTableFor(cat.label)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </aside>

          <div className="order-1 flex min-w-0 w-full flex-1 flex-col items-center gap-1 md:order-2">
            <Card className="!p-2 w-full min-w-0 overflow-auto">
            <div
              ref={canvasHostRef}
              className="w-full min-w-0 overflow-auto py-2"
            >
            <div
              className="mx-auto"
              style={{
                width: canvas.width,
                height: canvas.height,
              }}
            >
            <div
              style={{
                position: 'relative',
                width: canvas.width,
                height: canvas.height,
                margin: '0 auto',
              }}
            >
            <div
              style={{
                position: 'relative',
                width: canvas.width,
                height: canvas.height,
                background: pageSettings?.backgroundColor ?? effectiveLayout.page.backgroundColor,
                border: '1px solid #cbd5e1',
                direction: 'rtl',
              }}
              onClick={clearSelection}
            >
            {backgroundPreviewUrl &&
              pageSettings &&
              pageSettings.backgroundImageMode !== 'none' && (
                <img
                  src={backgroundPreviewUrl}
                  alt=""
                  aria-hidden
                  style={{
                    position: 'absolute',
                    pointerEvents: 'none',
                    zIndex: 0,
                    objectFit: pageSettings.backgroundImageFit,
                    ...(pageSettings.backgroundImageMode === 'corner'
                      ? {
                          top: 0,
                          right: 0,
                          width: '42%',
                          height: '38%',
                          maxWidth: mmToPx(125),
                          maxHeight: mmToPx(95),
                        }
                      : {
                          inset: 0,
                          width: '100%',
                          height: '100%',
                        }),
                  }}
                />
              )}
            {paddingPx && printablePx && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: paddingPx.left,
                  top: paddingPx.top,
                  width: printablePx.width,
                  height: printablePx.height,
                  border: '1px dashed #cbd5e1',
                  pointerEvents: 'none',
                  boxSizing: 'border-box',
                }}
              />
            )}
            {paddingPx && printablePx && (
              <div
                style={{
                  position: 'absolute',
                  left: paddingPx.left,
                  top: paddingPx.top,
                  width: printablePx.width,
                  height: printablePx.height,
                  direction: 'ltr',
                  ...designerGridBackground(),
                }}
                onClick={clearSelection}
              >
            {groupBorderOverlays.map((overlay) => (
              <div
                key={overlay.id}
                style={{
                  position: 'absolute',
                  left: mmToPx(overlay.box.xMm),
                  top: mmToPx(overlay.box.yMm),
                  width: mmToPx(overlay.box.wMm),
                  height: mmToPx(overlay.box.hMm),
                  border: '1px solid #64748b',
                  borderRadius: 4,
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                  zIndex: 40,
                }}
              />
            ))}
            {designerBlockGroups.map((group) => (
              <div
                key={`${group.id}-frame`}
                aria-hidden
                style={{
                  position: 'absolute',
                  left: mmToPx(group.box.xMm),
                  top: mmToPx(group.box.yMm),
                  width: mmToPx(group.box.wMm),
                  height: mmToPx(group.box.hMm),
                  border:
                    selectedGroupId === group.id
                      ? '2px solid #2563eb'
                      : '2px dashed #7c3aed',
                  borderRadius: 4,
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                  zIndex: 4,
                  background:
                    selectedGroupId === group.id ? 'rgba(37,99,235,0.04)' : 'transparent',
                }}
              />
            ))}
            {designerBlockGroups.map((group) => (
              <Rnd
                key={group.id}
                enableUserSelectHack={false}
                enableResizing={false}
                dragHandleClassName="designer-group-drag-handle"
                position={{
                  x: mmToPx(group.box.xMm),
                  y: mmToPx(group.box.yMm - GROUP_HANDLE_MM),
                }}
                size={{
                  width: mmToPx(group.box.wMm),
                  height: mmToPx(GROUP_HANDLE_MM),
                }}
                bounds="parent"
                onDragStart={() => {
                  groupHandleDragRef.current = {
                    groupId: group.id,
                    startX: mmToPx(group.box.xMm),
                    startY: mmToPx(group.box.yMm - GROUP_HANDLE_MM),
                  };
                }}
                onDragStop={(_e, d) => {
                  const start = groupHandleDragRef.current;
                  groupHandleDragRef.current = null;
                  if (!start || start.groupId !== group.id) return;
                  const dxMm = Math.round(pxToMm(d.x - start.startX) * 10) / 10;
                  const dyMm = Math.round(pxToMm(d.y - start.startY) * 10) / 10;
                  moveBlockGroup(group, dxMm, dyMm);
                }}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  selectGroup(group.id);
                }}
                style={{
                  zIndex: selectedGroupId === group.id ? 30 : 28,
                  border:
                    selectedGroupId === group.id
                      ? '2px solid #2563eb'
                      : '1px solid #7c3aed',
                  borderRadius: '4px 4px 0 0',
                  background: 'rgba(124,58,237,0.14)',
                  boxSizing: 'border-box',
                  direction: 'rtl',
                }}
                title={he.certTemplatesGroupDragHint}
              >
                <div
                  className="designer-group-drag-handle designer-drag-handle"
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'move',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#5b21b6',
                    padding: '0 6px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {group.label}
                </div>
              </Rnd>
            ))}
            {designerPreviewBlocks.map(({ block, isInjected }) => {
              const box = displayBlockBox(block.id);
              const persisted = effectiveLayout.blocks.find((b) => b.id === block.id);
              const preview = (
                <DesignerBlockPreview
                  block={block}
                  categoryById={categoryById}
                  previewPrefs={previewPrefs}
                  previewProfileName={previewProfileName}
                  orientation={orientation}
                />
              );
              if (isInjected || !persisted) {
                return (
                  <div
                    key={block.id}
                    style={{
                      position: 'absolute',
                      left: mmToPx(box.xMm),
                      top: mmToPx(box.yMm),
                      width: mmToPx(box.wMm),
                      height: mmToPx(box.hMm),
                      border: '1px dashed #a78bfa',
                      background: 'rgba(248,250,252,0.92)',
                      padding: 4,
                      boxSizing: 'border-box',
                      overflow: 'visible',
                      zIndex: 5,
                      direction: 'rtl',
                      pointerEvents: 'none',
                    }}
                    title={he.certTemplatesInjectedBlockHint}
                  >
                    {preview}
                  </div>
                );
              }
              const overflowVisible =
                block.type === 'evaluation' ||
                block.type === 'attendance' ||
                block.type === 'attendance_field' ||
                block.type === 'signature_field' ||
                block.type === 'signatures' ||
                block.type === 'date';
              const blockPadding = orientation === 'landscape' ? 2 : 4;
              const isSelected = selectedId === block.id;
              return (
              <Rnd
                key={block.id}
                enableUserSelectHack={false}
                dragHandleClassName="designer-drag-handle"
                size={{
                  width: mmToPx(box.wMm),
                  height: mmToPx(box.hMm),
                }}
                position={{
                  x: mmToPx(box.xMm),
                  y: mmToPx(box.yMm),
                }}
                bounds="parent"
                onDragStop={(_e, d) => {
                  updateBlock(
                    block.id,
                    {
                      box: {
                        ...persisted.box,
                        xMm: Math.round(pxToMm(d.x) * 10) / 10,
                        yMm: Math.round(pxToMm(d.y) * 10) / 10,
                      },
                    },
                    { immediate: true },
                  );
                }}
                onResizeStop={(_e, _dir, ref, _delta, pos) => {
                  updateBlock(
                    block.id,
                    {
                      box: {
                        xMm: Math.round(pxToMm(pos.x) * 10) / 10,
                        yMm: Math.round(pxToMm(pos.y) * 10) / 10,
                        wMm: Math.round(pxToMm(ref.offsetWidth) * 10) / 10,
                        hMm: Math.round(pxToMm(ref.offsetHeight) * 10) / 10,
                      },
                    },
                    { immediate: true },
                  );
                }}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  selectBlock(block.id);
                }}
                style={{
                  border: '1px dashed #94a3b8',
                  outline: isSelected ? '2px solid #2563eb' : 'none',
                  outlineOffset: 0,
                  background:
                    block.style.backgroundColor !== 'transparent'
                      ? block.style.backgroundColor
                      : 'rgba(248,250,252,0.9)',
                  padding: blockPadding,
                  boxSizing: 'border-box',
                  overflow: overflowVisible ? 'visible' : 'hidden',
                  zIndex: isSelected ? 30 : 10,
                  direction: 'rtl',
                }}
                className="designer-drag-handle"
              >
                {preview}
              </Rnd>
              );
            })}
              </div>
            )}
            </div>
            </div>
            </div>
            </div>
            </Card>
          </div>

          <aside className="order-2 w-full shrink-0 space-y-1.5 md:order-3 md:sticky md:top-4 md:w-[200px] md:max-w-[200px] md:self-start">
          {(selected || selectedGroup) && propertiesStyleBlock ? (
            <Card className="designer-properties-panel !p-2 max-h-[calc(100vh-6rem)] overflow-y-auto text-xs [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-slate-200 [&_input]:px-2 [&_input]:py-1 [&_input]:text-xs [&_label]:block [&_label]:text-xs [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-slate-200 [&_select]:px-2 [&_select]:py-1 [&_select]:text-xs [&_textarea]:w-full [&_textarea]:rounded-md [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:px-2 [&_textarea]:py-1 [&_textarea]:text-xs">
              <div className="mb-2 flex items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-text">{he.certTemplatesSectionProperties}</h3>
                  <p className="mt-0.5 text-[11px] text-text-muted">{blockLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label={he.certTemplatesCloseProperties}
                  title={he.certTemplatesCloseProperties}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <label>
                {he.certTemplatesFontSize}
                <input
                  type="number"
                  min={6}
                  max={72}
                  value={propertiesStyleBlock.style.fontSizePt}
                  onChange={(e) => {
                    const style = {
                      ...propertiesStyleBlock.style,
                      fontSizePt: Number(e.target.value),
                    };
                    if (selectedGroup) {
                      updateGroupBlockStyle(selectedGroup, style);
                    } else if (selected) {
                      updateBlock(selected.id, { style });
                    }
                  }}
                />
              </label>
              <label style={{ display: 'block', marginTop: '0.5rem' }}>
                {he.certTemplatesFontFamily}
                <select
                  value={propertiesStyleBlock.style.fontFamily}
                  onChange={(e) => {
                    const style = {
                      ...propertiesStyleBlock.style,
                      fontFamily: e.target.value,
                    };
                    if (selectedGroup) {
                      updateGroupBlockStyle(selectedGroup, style);
                    } else if (selected) {
                      updateBlock(selected.id, { style });
                    }
                  }}
                >
                  {CERTIFICATE_FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={propertiesStyleBlock.style.fontWeight === 'bold'}
                  onChange={(e) => {
                    const style = {
                      ...propertiesStyleBlock.style,
                      fontWeight: e.target.checked ? 'bold' : 'normal',
                    } as LayoutBlock['style'];
                    if (selectedGroup) {
                      updateGroupBlockStyle(selectedGroup, style);
                    } else if (selected) {
                      updateBlock(selected.id, { style });
                    }
                  }}
                />
                {he.certTemplatesBold}
              </label>
              <label style={{ display: 'block', marginTop: '0.5rem' }}>
                {he.certTemplatesTextAlign}
                <select
                  value={propertiesStyleBlock.style.textAlign}
                  onChange={(e) => {
                    const style = {
                      ...propertiesStyleBlock.style,
                      textAlign: e.target.value as LayoutBlock['style']['textAlign'],
                    };
                    if (selectedGroup) {
                      updateGroupBlockStyle(selectedGroup, style);
                    } else if (selected) {
                      updateBlock(selected.id, { style });
                    }
                  }}
                >
                  <option value="right">ימין</option>
                  <option value="center">מרכז</option>
                  <option value="left">שמאל</option>
                </select>
              </label>
              {selectedGroup?.id === 'attendance-group' && (
                <>
                  <p className="mt-2 text-xs text-text-muted">
                    בלוק כולל — כל שדות הנוכחות נעים יחד.
                  </p>
                  <div className="mt-2 space-y-2">
                    {ATTENDANCE_FIELD_KEYS.map((fieldKey) => {
                      const visible = Boolean(
                        effectiveLayout?.blocks.some(
                          (b) =>
                            b.type === 'attendance_field' && b.props.fieldKey === fieldKey,
                        ),
                      );
                      return (
                        <label
                          key={fieldKey}
                          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                        >
                          <input
                            type="checkbox"
                            checked={visible}
                            onChange={(e) =>
                              setAttendanceFieldVisible(fieldKey, e.target.checked)
                            }
                          />
                          {he.certTemplatesGroupShowField}: {DEFAULT_ATTENDANCE_FIELD_LABELS[fieldKey]}
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
              {selectedGroup?.id === 'signatures-group' && (
                <>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesSignatureHomeroom}
                    <input
                      value={signatureFieldLabel('homeroom')}
                      onChange={(e) => updateSignatureGroupLabel('homeroom', e.target.value)}
                    />
                  </label>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesSignaturePrincipal}
                    <input
                      value={signatureFieldLabel('principal')}
                      onChange={(e) => updateSignatureGroupLabel('principal', e.target.value)}
                    />
                  </label>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesSignatureParent}
                    <input
                      value={signatureFieldLabel('parent')}
                      onChange={(e) => updateSignatureGroupLabel('parent', e.target.value)}
                    />
                  </label>
                  {effectiveLayout?.blocks.some((b) => b.type === 'date') && (
                    <label style={{ display: 'block', marginTop: '0.5rem' }}>
                      תאריך
                      <select
                        value={
                          effectiveLayout.blocks.find((b) => b.type === 'date')?.type === 'date'
                            ? (
                                effectiveLayout.blocks.find(
                                  (b) => b.type === 'date',
                                ) as LayoutBlock & { type: 'date' }
                              ).props.format
                            : 'hebrew'
                        }
                        onChange={(e) => {
                          const dateBlock = effectiveLayout.blocks.find((b) => b.type === 'date');
                          if (!dateBlock || dateBlock.type !== 'date') return;
                          updateBlock(dateBlock.id, {
                            props: {
                              ...dateBlock.props,
                              format: e.target.value as 'hebrew',
                            },
                          } as Partial<LayoutBlock>);
                        }}
                      >
                        <option value="hebrew">עברי</option>
                      </select>
                    </label>
                  )}
                  <p className="mt-2 text-xs text-text-muted">
                    בלוק כולל — חתימות ותאריך נעים יחד.
                  </p>
                </>
              )}
              {selected?.type === 'static_text' && (
                <label style={{ display: 'block', marginTop: '0.5rem' }}>
                  {he.certTemplatesStaticText}
                  <textarea
                    rows={3}
                    value={selected.props.text}
                    onChange={(e) =>
                      updateBlock(selected.id, {
                        props: { ...selected.props, text: e.target.value },
                      } as Partial<LayoutBlock>)
                    }
                    style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
                  />
                </label>
              )}
              {selected?.type === 'grades_table' && (
                <>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesGradesCategory}
                    <select
                      value={selected.props.categoryId ?? ''}
                      onChange={(e) => {
                        const categoryId = e.target.value || null;
                        updateBlock(selected.id, {
                          props: {
                            ...selected.props,
                            categoryId,
                            showCategoryTitle: !categoryId,
                          },
                        } as Partial<LayoutBlock>);
                      }}
                    >
                      <option value="">{he.certTemplatesAllCategories}</option>
                      {parentCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selected.props.showSubCategoryRows ?? true}
                      onChange={(e) =>
                        updateBlock(selected.id, {
                          props: {
                            ...selected.props,
                            showSubCategoryRows: e.target.checked,
                          },
                        } as Partial<LayoutBlock>)
                      }
                    />
                    {he.certTemplatesShowSubCategoryRows}
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selected.props.showHeader}
                      onChange={(e) =>
                        updateBlock(selected.id, {
                          props: { ...selected.props, showHeader: e.target.checked },
                        } as Partial<LayoutBlock>)
                      }
                    />
                    {he.certTemplatesShowTableHeader}
                  </label>
                  <p className="mt-3 text-xs font-semibold text-text">
                    {he.certTemplatesColumnHeaders}
                  </p>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesColumnSubject}
                    <input
                      value={
                        selected.props.headerLabels?.subject ??
                        DEFAULT_GRADES_TABLE_HEADER_LABELS.subject
                      }
                      onChange={(e) =>
                        updateBlock(selected.id, {
                          props: {
                            ...selected.props,
                            headerLabels: {
                              ...(selected.props.headerLabels ??
                                DEFAULT_GRADES_TABLE_HEADER_LABELS),
                              subject: e.target.value,
                            },
                          },
                        } as Partial<LayoutBlock>)
                      }
                    />
                  </label>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesColumnGrade}
                    <input
                      value={
                        selected.props.headerLabels?.grade ??
                        DEFAULT_GRADES_TABLE_HEADER_LABELS.grade
                      }
                      onChange={(e) =>
                        updateBlock(selected.id, {
                          props: {
                            ...selected.props,
                            headerLabels: {
                              ...(selected.props.headerLabels ??
                                DEFAULT_GRADES_TABLE_HEADER_LABELS),
                              grade: e.target.value,
                            },
                          },
                        } as Partial<LayoutBlock>)
                      }
                    />
                  </label>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesColumnComment}
                    <input
                      value={
                        selected.props.headerLabels?.comment ??
                        DEFAULT_GRADES_TABLE_HEADER_LABELS.comment
                      }
                      onChange={(e) =>
                        updateBlock(selected.id, {
                          props: {
                            ...selected.props,
                            headerLabels: {
                              ...(selected.props.headerLabels ??
                                DEFAULT_GRADES_TABLE_HEADER_LABELS),
                              comment: e.target.value,
                            },
                          },
                        } as Partial<LayoutBlock>)
                      }
                    />
                  </label>
                  {!previewPrefs.commentPerGrade && (
                    <p className="mt-1 text-[11px] text-text-muted">
                      {he.certTemplatesColumnCommentHint}
                    </p>
                  )}
                </>
              )}
              {selected?.type === 'evaluation' && (
                <label style={{ display: 'block', marginTop: '0.5rem' }}>
                  {he.certTemplatesEvaluationTitle}
                  <input
                    value={selected.props.title}
                    onChange={(e) =>
                      updateBlock(selected.id, {
                        props: { ...selected.props, title: e.target.value },
                      } as Partial<LayoutBlock>)
                    }
                  />
                </label>
              )}
              {selected?.type === 'attendance_field' && (
                <>
                  {selectedFieldGroup && (
                    <p className="mt-2 text-[11px] text-text-muted">
                      {he.certTemplatesFieldPartOfGroup}
                    </p>
                  )}
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesAttendanceLabel}
                    <input
                      value={selected.props.label}
                      onChange={(e) =>
                        updateBlock(selected.id, {
                          props: { ...selected.props, label: e.target.value },
                        } as Partial<LayoutBlock>)
                      }
                    />
                  </label>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesFieldType}
                    <select
                      value={selected.props.fieldKey}
                      onChange={(e) => {
                        const fieldKey = e.target.value as AttendanceFieldKey;
                        updateBlock(selected.id, {
                          props: {
                            fieldKey,
                            label: DEFAULT_ATTENDANCE_FIELD_LABELS[fieldKey],
                          },
                        } as Partial<LayoutBlock>);
                      }}
                    >
                      {ATTENDANCE_FIELD_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {DEFAULT_ATTENDANCE_FIELD_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {selected?.type === 'signature_field' && (
                <>
                  {selectedFieldGroup && (
                    <p className="mt-2 text-[11px] text-text-muted">
                      {he.certTemplatesFieldPartOfGroup}
                    </p>
                  )}
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesSignatureLabel}
                    <input
                      value={selected.props.label}
                      onChange={(e) =>
                        updateBlock(selected.id, {
                          props: { ...selected.props, label: e.target.value },
                        } as Partial<LayoutBlock>)
                      }
                    />
                  </label>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesSignatureType}
                    <select
                      value={selected.props.signatureKey}
                      onChange={(e) => {
                        const signatureKey = e.target.value as SignatureFieldKey;
                        updateBlock(selected.id, {
                          props: {
                            signatureKey,
                            label: DEFAULT_SIGNATURE_FIELD_LABELS[signatureKey],
                          },
                        } as Partial<LayoutBlock>);
                      }}
                    >
                      {SIGNATURE_FIELD_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {DEFAULT_SIGNATURE_FIELD_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {selected?.type === 'date' && (
                <>
                  {selectedFieldGroup && (
                    <p className="mt-2 text-[11px] text-text-muted">
                      {he.certTemplatesFieldPartOfGroup}
                    </p>
                  )}
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesDateFormat}
                    <select
                      value={selected.props.format}
                      onChange={(e) =>
                        updateBlock(selected.id, {
                          props: {
                            ...selected.props,
                            format: e.target.value as 'hebrew',
                          },
                        } as Partial<LayoutBlock>)
                      }
                    >
                      <option value="hebrew">עברי</option>
                    </select>
                  </label>
                </>
              )}
              {selected?.type === 'attendance' && (
                <>
                  <p className="mt-2 text-xs text-text-muted">
                    בלוק כולל — כל שדות הנוכחות נעים יחד.
                  </p>
                  <div className="mt-2 space-y-2">
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selected.props.showAbsences}
                        onChange={(e) =>
                          updateBlock(selected.id, {
                            props: { ...selected.props, showAbsences: e.target.checked },
                          } as Partial<LayoutBlock>)
                        }
                      />
                      חיסורים
                    </label>
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selected.props.showLateness}
                        onChange={(e) =>
                          updateBlock(selected.id, {
                            props: { ...selected.props, showLateness: e.target.checked },
                          } as Partial<LayoutBlock>)
                        }
                      />
                      איחורים
                    </label>
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selected.props.showHourAbsences}
                        onChange={(e) =>
                          updateBlock(selected.id, {
                            props: { ...selected.props, showHourAbsences: e.target.checked },
                          } as Partial<LayoutBlock>)
                        }
                      />
                      חיסורי שעות
                    </label>
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selected.props.showHourLateness}
                        onChange={(e) =>
                          updateBlock(selected.id, {
                            props: { ...selected.props, showHourLateness: e.target.checked },
                          } as Partial<LayoutBlock>)
                        }
                      />
                      איחורי שעות
                    </label>
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    הערה: בהדפסה/תצוגת תעודה בפועל ייתכן שחלק מהשדות יוסתרו גם לפי הגדרות בית הספר.
                  </p>
                </>
              )}
              {selected?.type === 'signatures' && (
                <>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesSignatureHomeroom}
                    <input
                      value={selected.props.labels.homeroom}
                      onChange={(e) =>
                        updateBlock(selected.id, {
                          props: {
                            ...selected.props,
                            labels: { ...selected.props.labels, homeroom: e.target.value },
                          },
                        } as Partial<LayoutBlock>)
                      }
                    />
                  </label>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesSignaturePrincipal}
                    <input
                      value={selected.props.labels.principal}
                      onChange={(e) =>
                        updateBlock(selected.id, {
                          props: {
                            ...selected.props,
                            labels: { ...selected.props.labels, principal: e.target.value },
                          },
                        } as Partial<LayoutBlock>)
                      }
                    />
                  </label>
                  <label style={{ display: 'block', marginTop: '0.5rem' }}>
                    {he.certTemplatesSignatureParent}
                    <input
                      value={selected.props.labels.parent}
                      onChange={(e) =>
                        updateBlock(selected.id, {
                          props: {
                            ...selected.props,
                            labels: { ...selected.props.labels, parent: e.target.value },
                          },
                        } as Partial<LayoutBlock>)
                      }
                    />
                  </label>
                  <p className="mt-2 text-xs text-text-muted">
                    בלוק כולל — חתימות ותאריך נעים יחד. אילו חתימות מוצגות נקבע בהגדרות בית הספר.
                  </p>
                </>
              )}
              {selected?.type === 'field' && (
                <label style={{ display: 'block', marginTop: '0.5rem' }}>
                  שדה
                  <select
                    value={selected.props.fieldKey}
                    onChange={(e) =>
                      updateBlock(selected.id, {
                        props: {
                          ...selected.props,
                          fieldKey: e.target.value as typeof selected.props.fieldKey,
                        },
                      } as Partial<LayoutBlock>)
                    }
                  >
                    <option value="studentName">שם תלמיד/ה</option>
                    <option value="className">כיתה</option>
                    <option value="termName">תקופה</option>
                    <option value="schoolName">בית ספר</option>
                    <option value="classYearHebrew">שנת לימודים</option>
                    <option value="cohort">מחזור</option>
                    <option value="profileName">שם פרופיל</option>
                  </select>
                </label>
              )}
              {selected?.type === 'logo' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={{ display: 'block' }}>
                    {he.certTemplatesUploadLogo}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      disabled={logoUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadLogo(file);
                        e.target.value = '';
                      }}
                      style={{ display: 'block', marginTop: '0.25rem' }}
                    />
                  </label>
                  {selected.props.storageKey && (
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                      {selected.props.storageKey}
                    </p>
                  )}
                  {logoMessage && (
                    <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>{logoMessage}</p>
                  )}
                </div>
              )}
              {selected && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="mt-4"
                onClick={() => removeBlock(selected.id)}
              >
                {he.remove}
              </Button>
              )}
            </Card>
          ) : (
            <Card className="!p-4">
              <h3 className="mb-2 text-sm font-semibold text-text">{he.certTemplatesSectionProperties}</h3>
              <p className="text-sm text-text-muted">
                {he.certTemplatesSelectBlockHint}
                <span className="mt-1 block text-[11px]">{he.certTemplatesGroupSelectHint}</span>
              </p>
            </Card>
          )}
          </aside>
        </div>
      )}

      {showPreview && data && (
        <CertificateTemplatePreview
          templateId={id}
          templateName={data.name}
          certificateProfileId={previewProfileId}
          onClose={() => setShowPreview(false)}
        />
      )}
    </AdminShell>
  );
}
