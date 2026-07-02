import { ForbiddenException } from '@nestjs/common';

export const TERM_LOCKED_CODE = 'TERM_LOCKED' as const;

export class TermLockedException extends ForbiddenException {
  constructor(message = 'Grading term is locked') {
    super({ code: TERM_LOCKED_CODE, message });
  }
}

export function assertTermNotLocked(term: { isLocked: boolean }) {
  if (term.isLocked) {
    throw new TermLockedException();
  }
}
