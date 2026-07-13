import { NextRequest, NextResponse } from 'next/server';

// Certificate generation is slow (Chromium PDF rendering per student).
// The default Next.js rewrite proxy times out; this route handler forwards
// without that restriction.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const body = await req.text();

  const res = await fetch('http://localhost:3001/certificates/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    },
    body,
    signal: AbortSignal.timeout(600_000),
  });

  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
