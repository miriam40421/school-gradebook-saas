'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { getToken, triggerBlobDownload } from '@/lib/api';
import { he, translateApiError } from '@/lib/he';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

type Props = {
  templateId: string;
  templateName: string;
  certificateProfileId?: string | null;
  onClose: () => void;
};

export function CertificateTemplatePreview({
  templateId,
  templateName,
  certificateProfileId,
  onClose,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError('לא מחובר');
      return;
    }
    const params = new URLSearchParams({ token });
    if (certificateProfileId) params.set('certificateProfileId', certificateProfileId);
    setPdfUrl(`/api/pdf/template-preview/${templateId}?${params.toString()}`);
  }, [templateId, certificateProfileId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) throw new Error('לא מחובר');
      const params = new URLSearchParams({ token });
      if (certificateProfileId) params.set('certificateProfileId', certificateProfileId);
      const res = await fetch(`/api/pdf/template-preview/${templateId}?${params.toString()}`);
      if (!res.ok) throw new Error('שגיאה בהורדת הקובץ');
      const blob = await res.blob();
      const filename = `תבנית-${templateName.replace(/\s+/g, '-')}.pdf`;
      triggerBlobDownload(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? translateApiError(err.message) : 'שגיאה בהורדת הקובץ');
    } finally {
      setDownloading(false);
    }
  }, [templateId, templateName, certificateProfileId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={he.certTemplatesPreview}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-elevation5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-text">
            {he.certTemplatesPreview}: {templateName}
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label={he.closePreview}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 p-6">
          {error && <Alert variant="error">{translateApiError(error)}</Alert>}
          {pdfUrl && (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={() => window.open(pdfUrl, '_blank', 'noopener')}
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                {he.certTemplatesPreview} — פתח בכרטיסייה חדשה
              </Button>
              <Button
                type="button"
                variant="secondary"
                loading={downloading}
                disabled={downloading}
                onClick={() => void handleDownload()}
              >
                <Download className="h-4 w-4" aria-hidden />
                {downloading ? 'מוריד…' : he.certificatesDownload}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
