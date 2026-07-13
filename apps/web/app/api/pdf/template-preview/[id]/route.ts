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

  const certificateProfileId = req.nextUrl.searchParams.get('certificateProfileId');
  const backendUrl = `http://localhost:3001/certificate-templates/${id}/preview`;

  const res = await fetch(backendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(certificateProfileId ? { certificateProfileId } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Error');
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const pdf = await res.arrayBuffer();
  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
    },
  });
}
