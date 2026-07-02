import {
  normalizeCertificateProfiles,
  resolveCertificateTemplateForProfile,
  resolveProfileSubjects,
  type CertificateProfileDto,
} from '@school/shared';

describe('resolveProfileSubjects', () => {
  const all = [
    { id: 'a', name: 'Math' },
    { id: 'b', name: 'English' },
    { id: 'c', name: 'Science' },
  ];

  it('returns all subjects when profile has no subjectIds', () => {
    const profile: CertificateProfileDto = {
      id: 'p1',
      name: 'All',
      certificate: {},
    };
    expect(resolveProfileSubjects(profile, all).map((s) => s.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('filters and preserves order from subjectIds', () => {
    const profile: CertificateProfileDto = {
      id: 'p1',
      name: 'Subset',
      certificate: {},
      subjectIds: ['c', 'a'],
    };
    expect(resolveProfileSubjects(profile, all).map((s) => s.id)).toEqual([
      'c',
      'a',
    ]);
  });

  it('returns empty when subjectIds is empty array', () => {
    const profile: CertificateProfileDto = {
      id: 'p1',
      name: 'None',
      certificate: {},
      subjectIds: [],
    };
    expect(resolveProfileSubjects(profile, all)).toEqual([]);
  });
});

describe('normalizeCertificateProfiles', () => {
  it('preserves subjectIds on profiles', () => {
    const { profiles } = normalizeCertificateProfiles({
      certificateProfiles: [
        {
          id: 'p1',
          name: 'א–ד',
          certificate: {},
          subjectIds: ['s1', 's2'],
        },
      ],
    });
    expect(profiles[0]?.subjectIds).toEqual(['s1', 's2']);
  });

  it('preserves templateId on profiles', () => {
    const { profiles } = normalizeCertificateProfiles({
      certificateProfiles: [
        {
          id: 'p1',
          name: 'Custom',
          certificate: {},
          templateId: 'tpl-1',
        },
      ],
    });
    expect(profiles[0]?.templateId).toBe('tpl-1');
  });
});

describe('resolveCertificateTemplateForProfile', () => {
  it('uses built-in when templateId absent', () => {
    const r = resolveCertificateTemplateForProfile({
      certificateProfiles: [
        { id: 'p1', name: 'Default', certificate: {}, templateKey: 'default-rtl' },
      ],
    });
    expect(r.useBuiltIn).toBe(true);
    expect(r.templateKey).toBe('default-rtl');
  });

  it('prefers custom templateId when set', () => {
    const r = resolveCertificateTemplateForProfile({
      certificateProfiles: [
        {
          id: 'p1',
          name: 'Custom',
          certificate: {},
          templateId: 'tpl-abc',
        },
      ],
    }, 'p1');
    expect(r.useBuiltIn).toBe(false);
    expect(r.templateId).toBe('tpl-abc');
  });
});
