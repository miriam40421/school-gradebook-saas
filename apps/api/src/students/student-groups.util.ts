import { BadRequestException } from '@nestjs/common';

export type ClassGroupForMembership = {
  id: string;
  classId: string;
  subjectId: string | null;
};

export function assertValidGroupMemberships(
  classId: string,
  classGroups: ClassGroupForMembership[],
  classGroupIds: string[],
): void {
  const byId = new Map(classGroups.map((g) => [g.id, g]));
  const subjectToGroup = new Map<string, string>();
  for (const groupId of classGroupIds) {
    const group = byId.get(groupId);
    if (!group || group.classId !== classId) {
      throw new BadRequestException('Group not found in class');
    }
    if (!group.subjectId) {
      throw new BadRequestException('Group must be linked to a subject');
    }
    if (subjectToGroup.has(group.subjectId)) {
      throw new BadRequestException('Only one group per subject per student');
    }
    subjectToGroup.set(group.subjectId, groupId);
  }
}
