import { ApiError } from './ApiError';

export class JwtError extends ApiError {
  constructor(message: string, status: number = 401, code?: string, cause?: Error) {
    super(message, status, code);
    if (cause) {
      this.cause = cause;
    }
  }
}

// Конкретные ошибки JWT
export class TokenGenerationError extends JwtError {
  constructor(cause?: Error) {
    super(
      'Ошибка при генерации JWT-токена',
      500,
      'TOKEN_GENERATION_ERROR',
      cause
    );
  }
}

export class TokenVerificationError extends JwtError {
  constructor(cause?: Error) {
    super(
      'Ошибка при верификации JWT-токена',
      401,
      'TOKEN_VERIFICATION_ERROR',
      cause
    );
  }
}

export class TokenExpiredError extends JwtError {
  constructor() {
    super('Срок действия JWT-токена истёк', 401, 'TOKEN_EXPIRED');
  }
}

export class InvalidTokenError extends JwtError {
  constructor() {
    super('Некорректный JWT-токен', 401, 'INVALID_TOKEN');
  }
}

export class MissingSecretError extends JwtError {
  constructor() {
    super(
      'Отсутствует секретный ключ для подписи JWT',
      500,
      'MISSING_SECRET'
    );
  }
}
