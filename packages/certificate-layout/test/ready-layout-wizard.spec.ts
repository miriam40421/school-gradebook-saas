import { buildReadyCertificateLayout, distributeRowSlots } from '../src/ready-layout-wizard';
import type { CertificatePrefs } from '@school/shared';

const basePrefs: CertificatePrefs = {
  evaluation: true,
  signatures: true,
  absences: true,
  lateness: true,
  hourAbsences: true,
  hourLateness: true,
};

describe('distributeRowSlots', () => {
  it('splits width evenly for three items', () => {
    const slots = distributeRowSlots(3, 190, 6);
    expect(slots).toHaveLength(3);
    expect(slots[0]!.xMm).toBe(0);
    expect(slots[1]!.xMm).toBeCloseTo(65.3, 1);
    expect(slots[2]!.xMm).toBeCloseTo(130.6, 1);
    const total = slots[slots.length - 1]!.xMm + slots[slots.length - 1]!.wMm;
    expect(total).toBeCloseTo(190, 0);
  });
});

describe('buildReadyCertificateLayout', () => {
  it('creates symmetric layout with one table per category', () => {
    const layout = buildReadyCertificateLayout({
      orientation: 'portrait',
      categoryIds: ['cat-a', 'cat-b'],
      prefs: basePrefs,
      createId: () => `id-${Math.random()}`,
    });

    expect(layout.blocks.length).toBeGreaterThan(8);
    const tables = layout.blocks.filter((b) => b.type === 'grades_table');
    expect(tables).toHaveLength(2);
    expect(tables[0]!.box.yMm).toBe(tables[1]!.box.yMm);
    expect(tables[0]!.box.wMm).toBe(tables[1]!.box.wMm);

    const att = layout.blocks.filter((b) => b.type === 'attendance_field');
    expect(att.length).toBe(4);
    const attWidths = att.map((b) => b.box.wMm);
    expect(new Set(attWidths).size).toBe(1);

    const sig = layout.blocks.filter((b) => b.type === 'signature_field');
    expect(sig.length).toBe(3);
    expect(sig[0]!.box.yMm).toBe(sig[1]!.box.yMm);
    const homeroom = sig.find((b) => b.type === 'signature_field' && b.props.signatureKey === 'homeroom');
    const parent = sig.find((b) => b.type === 'signature_field' && b.props.signatureKey === 'parent');
    expect(homeroom!.box.xMm).toBeGreaterThan(parent!.box.xMm);

    const date = layout.blocks.find((b) => b.type === 'date');
    expect(date).toBeDefined();
    expect(date!.box.yMm).toBe(sig[0]!.box.yMm);
  });

  it('uses single combined table when no categories', () => {
    const layout = buildReadyCertificateLayout({
      orientation: 'portrait',
      categoryIds: [],
      prefs: basePrefs,
      createId: () => 'x',
    });
    const tables = layout.blocks.filter((b) => b.type === 'grades_table');
    expect(tables).toHaveLength(1);
    expect(tables[0]!.props).toMatchObject({ categoryId: null });
  });

  it('includes evaluation block when pref is on', () => {
    const layout = buildReadyCertificateLayout({
      orientation: 'portrait',
      categoryIds: ['c1'],
      prefs: { ...basePrefs, evaluation: true },
      createId: () => 'x',
    });
    expect(layout.blocks.some((b) => b.type === 'evaluation')).toBe(true);
  });

  it('includes profile name block when pref is on', () => {
    const layout = buildReadyCertificateLayout({
      orientation: 'portrait',
      categoryIds: ['c1'],
      prefs: { ...basePrefs, showProfileNameOnCertificate: true },
      createId: () => 'x',
    });
    expect(
      layout.blocks.some(
        (b) => b.type === 'field' && b.props.fieldKey === 'profileName',
      ),
    ).toBe(true);
  });

  it('omits evaluation when pref is off', () => {
    const layout = buildReadyCertificateLayout({
      orientation: 'portrait',
      categoryIds: ['c1'],
      prefs: { ...basePrefs, evaluation: false, homeroomComment: false },
      createId: () => 'x',
    });
    expect(layout.blocks.some((b) => b.type === 'evaluation')).toBe(false);
  });

  it('fits attendance and signatures within printable area on landscape', () => {
    const layout = buildReadyCertificateLayout({
      orientation: 'landscape',
      categoryIds: ['cat-a', 'cat-b', 'cat-c', 'cat-d'],
      prefs: basePrefs,
      createId: () => 'x',
    });
    const printableH = 210 - 20;
    const bottom = Math.max(...layout.blocks.map((b) => b.box.yMm + b.box.hMm));
    expect(bottom).toBeLessThanOrEqual(printableH + 0.5);

    const att = layout.blocks.filter((b) => b.type === 'attendance_field');
    const sig = layout.blocks.filter((b) => b.type === 'signature_field');
    expect(att.length).toBeGreaterThan(0);
    expect(sig.length).toBeGreaterThan(0);
    expect(att.every((b) => b.box.yMm + b.box.hMm <= printableH + 0.5)).toBe(true);
    expect(sig.every((b) => b.box.yMm + b.box.hMm <= printableH + 0.5)).toBe(true);

    const evalBlock = layout.blocks.find((b) => b.type === 'evaluation');
    expect(evalBlock).toBeDefined();
    if (evalBlock && att.length > 0) {
      const attTop = Math.min(...att.map((b) => b.box.yMm));
      expect(evalBlock.box.yMm + evalBlock.box.hMm).toBeLessThanOrEqual(attTop + 0.5);
    }
  });

  it('places landscape grade tables in a single row when up to four categories', () => {
    const layout = buildReadyCertificateLayout({
      orientation: 'landscape',
      categoryIds: ['cat-a', 'cat-b', 'cat-c', 'cat-d'],
      prefs: basePrefs,
      createId: () => 'x',
    });
    const tables = layout.blocks.filter((b) => b.type === 'grades_table');
    expect(tables).toHaveLength(4);
    const rowYs = new Set(tables.map((b) => b.box.yMm));
    expect(rowYs.size).toBe(1);
  });

  it('keeps landscape title clear of the right header column', () => {
    const layout = buildReadyCertificateLayout({
      orientation: 'landscape',
      categoryIds: ['cat-a'],
      prefs: { ...basePrefs, showProfileNameOnCertificate: true },
      createId: () => 'x',
    });
    const title = layout.blocks.find(
      (b) => b.type === 'static_text' && b.props.text === 'תעודת הערכה',
    );
    const profile = layout.blocks.find(
      (b) => b.type === 'field' && b.props.fieldKey === 'profileName',
    );
    expect(title).toBeDefined();
    expect(profile).toBeDefined();
    expect(title!.box.xMm + title!.box.wMm).toBeLessThanOrEqual(profile!.box.xMm + 0.5);
  });
});
