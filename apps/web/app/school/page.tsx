'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import { AdminShell } from '@/components/AdminShell';
import { apiFetch, apiUpload, fetchAuthenticatedAssetBlob } from '@/lib/api';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';

type School = {
  id: string;
  name: string;
  logoStorageKey: string | null;
};

export default function SchoolPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['school'],
    queryFn: () => apiFetch<School>('/school'),
  });

  const [name, setName] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoObjectUrlRef = useRef<string | null>(null);

  const loadLogoPreview = async () => {
    try {
      const blob = await fetchAuthenticatedAssetBlob('/school/logo-asset');
      if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
      const url = URL.createObjectURL(blob);
      logoObjectUrlRef.current = url;
      setLogoPreview(url);
    } catch {
      setLogoPreview(null);
    }
  };

  useEffect(() => {
    if (data?.name) setName(data.name);
  }, [data?.name]);

  useEffect(() => {
    if (data?.logoStorageKey) void loadLogoPreview();
  }, [data?.logoStorageKey]);

  useEffect(() => {
    return () => {
      if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
    };
  }, []);

  const uploadLogo = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return apiUpload<{ storageKey: string }>('/school/logo', fd);
    },
    onSuccess: () => {
      void loadLogoPreview();
      qc.invalidateQueries({ queryKey: ['school'] });
    },
  });

  const save = useMutation({
    mutationFn: () =>
      apiFetch<School>('/school', {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school'] }),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <AdminShell>
      <PageHeader
        title={he.schoolSettings}
        actions={
          data ? (
            <Button type="submit" form="school-settings-form" disabled={save.isPending}>
              <Save className="h-4 w-4" aria-hidden />
              {he.save}
            </Button>
          ) : undefined
        }
      />

      {isLoading && <Skeleton className="h-40 w-full" />}
      {error && (
        <Alert variant="error" className="mb-4">
          {translateApiError((error as Error).message)}
        </Alert>
      )}

      {data && (
        <form id="school-settings-form" onSubmit={onSubmit} className="space-y-4">
          {(save.isSuccess || save.isError) && (
            <div className="mb-2">
              {save.isSuccess && <Alert variant="success">{he.saved}</Alert>}
              {save.isError && (
                <Alert variant="error">
                  {translateApiError((save.error as Error).message)}
                </Alert>
              )}
            </div>
          )}

          <Card>
            <h2 className="mb-3 text-lg font-semibold text-text">{he.schoolLogoTitle}</h2>
            <p className="mb-4 text-sm text-text-muted">{he.schoolLogoHint}</p>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="לוגו בית הספר"
                  className="h-20 w-20 rounded-lg border border-slate-200 object-contain p-1"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                  <ImagePlus className="h-8 w-8 text-slate-400" aria-hidden />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadLogo.isPending}
                >
                  <ImagePlus className="h-4 w-4" aria-hidden />
                  {logoPreview ? he.schoolLogoChange : he.schoolLogoUpload}
                </Button>
                {uploadLogo.isError && (
                  <Alert variant="error" className="text-xs">
                    {translateApiError((uploadLogo.error as Error).message)}
                  </Alert>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadLogo.mutate(file);
                  e.target.value = '';
                }}
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold text-text">{he.schoolName}</h2>
            <div className="max-w-sm">
              <Label htmlFor="school-name">{he.schoolName}</Label>
              <Input
                id="school-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </Card>

          <div className="flex justify-end pb-6">
            <Button type="submit" disabled={save.isPending}>
              <Save className="h-4 w-4" aria-hidden />
              {he.save}
            </Button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
