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
