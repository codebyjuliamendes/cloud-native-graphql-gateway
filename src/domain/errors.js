/**
 * Typed application errors. Anything that is an AppError is considered
 * "expected": its message is safe to return to clients and it never counts
 * as an infrastructure failure for the circuit breakers.
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {{ code: string, status: number, details?: unknown, cause?: unknown }} options
   */
  constructor(message, { code, status, details, cause }) {
    super(message, cause ? { cause } : undefined);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, { code: 'BAD_USER_INPUT', status: 400, details });
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, { code: 'NOT_FOUND', status: 404 });
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, { code: 'CONFLICT', status: 409 });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Missing or invalid API key') {
    super(message, { code: 'UNAUTHENTICATED', status: 401 });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', cause) {
    super(message, { code: 'SERVICE_UNAVAILABLE', status: 503, cause });
  }
}
