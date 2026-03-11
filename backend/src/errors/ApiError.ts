export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public cause?: Error; 

  constructor(
    message: string,
    status: number,
    code?: string,
    cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    if (cause) this.cause = cause;

    // Сохраняем стек вызовов для отладки
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
