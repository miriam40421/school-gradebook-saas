import { BadRequestException, Injectable } from '@nestjs/common';

const DICTA_API = 'https://nakdan-u1-0.loadbalancer.dicta.org.il/api';
const TIMEOUT_MS = 6000;

@Injectable()
export class NikudService {
  private readonly cache = new Map<string, string>();

  async nikud(text: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return text;
    if (this.cache.has(trimmed)) return this.cache.get(trimmed)!;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(DICTA_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'nakdan', genre: 'modern', data: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: Array<{ word?: string; sep?: boolean; options?: string[] }> = await res.json();
      const result = data
        .map((t) => {
          if (t.options && t.options.length > 0) {
            // Prefer an option without Dicta's morpheme-boundary marker '|'
            const clean = t.options.find((o) => !o.includes('|'));
            if (clean) return clean;
            return t.options[0].replace(/\|/g, '');
          }
          return t.word ?? '';
        })
        .join('')
        .trim();

      this.cache.set(trimmed, result);
      return result;
    } catch {
      throw new BadRequestException('Nikud service unavailable');
    } finally {
      clearTimeout(timer);
    }
  }
}
