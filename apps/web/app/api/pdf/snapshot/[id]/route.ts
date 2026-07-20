import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/certificates/snapshots/${id}/pdf`;
  const res = await fetch(backendUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Not found' }, { status: res.status });
  }

  const pdf = await res.arrayBuffer();
  const isDownload = req.nextUrl.searchParams.get('download') === '1';
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': isDownload ? 'attachment' : 'inline',
      'Cache-Control': 'no-store',
    },
  });
}
