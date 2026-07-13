'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

function RedirectToCertificates() {
  const router = useRouter();
  const params = useSearchParams();
  const classId = params.get('classId');
  const termId = params.get('termId');

  useEffect(() => {
    const q = new URLSearchParams({ tab: 'certificates' });
    if (classId) q.set('classId', classId);
    if (termId) q.set('termId', termId);
    router.replace(`/teacher/gradebook?${q.toString()}`);
  }, [router, classId, termId]);

  return <Skeleton className="h-24 w-full m-8" />;
}

export default function TeacherCertificatesRoute() {
  return (
    <Suspense fallback={<Skeleton className="h-24 w-full m-8" />}>
      <RedirectToCertificates />
    </Suspense>
  );
}
