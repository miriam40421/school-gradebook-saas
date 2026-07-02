'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { CertificateSetupBanner } from '@/components/CertificateSetupBanner';
import { apiFetch } from '@/lib/api';
import type {
  CertificateTemplateOrientation,
  CertificateTemplateSummaryDto,
} from '@school/shared';
import { formatCertificateProfileLabel, normalizeCertificateProfiles } from '@school/shared';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

type SchoolSettings = { settingsJson?: Record<string, unknown> };

export default function CertificateTemplatesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [orientation, setOrientation] =
    useState<CertificateTemplateOrientation>('portrait');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['certificate-templates'],
    queryFn: () => apiFetch<CertificateTemplateSummaryDto[]>('/certificate-templates'),
  });

  const { data: school } = useQuery({
    queryKey: ['school'],
    queryFn: () => apiFetch<SchoolSettings>('/school'),
  });

  const profiles = normalizeCertificateProfiles(school?.settingsJson).profiles;

  const profileForTemplate = (templateId: string) =>
    profiles.find((p) => p.templateId === templateId);

  const create = useMutation({
    mutationFn: () =>
      apiFetch<CertificateTemplateSummaryDto>('/certificate-templates', {
        method: 'POST',
        body: JSON.stringify({ name, orientation }),
      }),
    onSuccess: async (newTemplate) => {
      if (selectedProfileId) {
        const updatedProfiles = profiles.map((p) =>
          p.id === selectedProfileId ? { ...p, templateId: newTemplate.id } : p,
        );
        await apiFetch('/school', {
          method: 'PATCH',
          body: JSON.stringify({
            settingsJson: {
              ...(school?.settingsJson ?? {}),
              certificateProfiles: updatedProfiles,
            },
          }),
        });
        await qc.invalidateQueries({ queryKey: ['school'] });
        const linked = profiles.find((p) => p.id === selectedProfileId);
        if (linked) setLinkSuccess(he.certTemplateAutoLinked(formatCertificateProfileLabel(linked)));
      }
      await qc.invalidateQueries({ queryKey: ['certificate-templates'] });
      setShowCreate(false);
      setName('');
      setSelectedProfileId('');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/certificate-templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleteError(null);
      void qc.invalidateQueries({ queryKey: ['certificate-templates'] });
    },
    onError: (err: Error) => setDeleteError(translateApiError(err.message)),
  });

  return (
    <AdminShell>
      <PageHeader
        title={he.certTemplatesTitle}
        description="צרי עיצוב ויזואלי לתעודה — לאחר הגדרת פרופיל תעודה."
        actions={
          <Button type="button" onClick={() => { setShowCreate(true); setLinkSuccess(null); }}>
            <Plus className="h-4 w-4" aria-hidden />
            {he.certTemplatesCreate}
          </Button>
        }
      />

      <CertificateSetupBanner />

      {linkSuccess && (
        <Alert variant="success" className="mb-4">{linkSuccess}</Alert>
      )}

      {showCreate && (
        <Card className="mb-4 max-w-md">
          <div className="space-y-3">
            <div>
              <Label>{he.name}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>{he.certTemplatesOrientation}</Label>
              <Select
                value={orientation}
                onChange={(e) =>
                  setOrientation(e.target.value as CertificateTemplateOrientation)
                }
              >
                <option value="portrait">{he.certTemplatesPortrait}</option>
                <option value="landscape">{he.certTemplatesLandscape}</option>
              </Select>
            </div>
            {profiles.length > 0 && (
              <div>
                <Label>{he.certTemplateSelectProfile}</Label>
                <Select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                >
                  <option value="">ללא שיוך (כללי)</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatCertificateProfileLabel(p)}
                    </option>
                  ))}
                </Select>
                {selectedProfileId && (
                  <p className="mt-1 text-xs text-text-muted">
                    לאחר יצירה — העיצוב ישויך אוטומטית לפרופיל זה.
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={!name.trim() || create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending ? 'יוצרת…' : he.create}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                {he.cancel}
              </Button>
            </div>
            {create.error && (
              <Alert variant="error">
                {translateApiError((create.error as Error).message)}
              </Alert>
            )}
          </div>
        </Card>
      )}

      {isLoading && <Spinner label={he.loading} />}
      {error && (
        <Alert variant="error">{translateApiError((error as Error).message)}</Alert>
      )}
      {deleteError && <Alert variant="error">{deleteError}</Alert>}

      <DataTable>
        <thead>
          <tr>
            <th>{he.name}</th>
            <th>{he.certTemplatesOrientation}</th>
            <th>גרסה</th>
            <th>{he.certTemplateLinkedProfile}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => {
            const linkedProfile = profileForTemplate(t.id);
            return (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>
                  {t.orientation === 'landscape'
                    ? he.certTemplatesLandscape
                    : he.certTemplatesPortrait}
                </td>
                <td>{t.layoutVersion}</td>
                <td>
                  {linkedProfile ? (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {formatCertificateProfileLabel(linkedProfile)}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">{he.certTemplateNoProfileLinked}</span>
                  )}
                </td>
                <td>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/certificate-templates/${t.id}/edit`}
                        className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-primary no-underline hover:text-primary-hover"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        {he.certTemplatesEdit}
                      </Link>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmDeleteId(t.id)}
                      >
                        {he.delete}
                      </Button>
                    </div>
                    {confirmDeleteId === t.id && (
                      <div className="flex items-center gap-2 rounded-md bg-danger-light px-3 py-2 text-sm">
                        <span>{he.delete} {t.name}?</span>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={remove.isPending}
                          onClick={() => {
                            remove.mutate(t.id);
                            setConfirmDeleteId(null);
                          }}
                        >
                          {he.confirmYes ?? 'כן'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          {he.confirmNo ?? 'ביטול'}
                        </Button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </DataTable>
    </AdminShell>
  );
}
