// studio/src/lib/errors.ts

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly diagnostics?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    diagnostics?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.diagnostics = diagnostics;
  }

  get isConflict() {
    return this.status === 409;
  }

  get isAuth() {
    return this.status === 401 || this.status === 403;
  }
}

/**
 * "There is no session" and "the API could not be reached" are different
 * problems, and the launcher must not offer a password form for the second one.
 */
export function isUnsignedIn(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/** Signed in, but this identity may not see this workspace. */
export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}
