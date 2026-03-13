import { config } from '../config';
import jwt, { SignOptions, JwtPayload, JsonWebTokenError } from 'jsonwebtoken';
import ms, { StringValue } from 'ms';
import {
  ApiError,
  TokenGenerationError,
  TokenVerificationError,
  TokenExpiredError,
  InvalidTokenError,
  MissingSecretError
} from '../errors';

// Безопасное получение и преобразование времени жизни токенов
const getExpiryInMilliseconds = (envValue: string | undefined, defaultValue: string): number => {
  const value = envValue || defaultValue;

  try {
    const stringValue = value as StringValue;
    return ms(stringValue);
  } catch (error) {
    console.warn(`Некорректное значение времени: ${value}. Используется значение по умолчанию: ${defaultValue}`);
    const defaultStringValue = defaultValue as StringValue;
    return ms(defaultStringValue);
  }
};

const ACCESS_TOKEN_EXPIRY_MS = getExpiryInMilliseconds(
  process.env.AUTH_ACCESS_TOKEN_EXPIRY,
  '15m'
);
const REFRESH_TOKEN_EXPIRY_MS = getExpiryInMilliseconds(
  process.env.AUTH_REFRESH_TOKEN_EXPIRY,
  '7d'
);

// Конвертируем миллисекунды в секунды (JWT ожидает число секунд)
const ACCESS_TOKEN_EXPIRY_SEC = Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000);
const REFRESH_TOKEN_EXPIRY_SEC = Math.floor(REFRESH_TOKEN_EXPIRY_MS / 1000);

// Интерфейс для полезной нагрузки токена
interface TokenPayload extends JwtPayload {
  userId: string;
}

// Опции для подписи токенов
const accessTokenOptions: SignOptions = {
  expiresIn: ACCESS_TOKEN_EXPIRY_SEC,
  algorithm: 'HS256'
};

const refreshTokenOptions: SignOptions = {
  expiresIn: REFRESH_TOKEN_EXPIRY_SEC,
  algorithm: 'HS256'
};

// Централизованный обработчик ошибок для операций с JWT
const handleJwtOperation = <T>(
  operation: () => T,
  operationName: string
): T => {
  try {
    return operation();
  } catch (error: unknown) {
    if (error instanceof JsonWebTokenError) {
      switch (error.name) {
        case 'TokenExpiredError':
          throw new TokenExpiredError();
        case 'JsonWebTokenError':
          throw new InvalidTokenError();
        default:
          throw new TokenVerificationError(error);
      }
    } else if (error instanceof Error) {
      throw new TokenGenerationError(error);
    } else {
      throw new ApiError('Неизвестная ошибка JWT', 500, 'UNKNOWN_JWT_ERROR');
    }
  }
};

export const generateTokens = (userId: string): { accessToken: string; refreshToken: string } => {
  return handleJwtOperation(() => {
    if (!userId) {
      throw new ApiError('ID пользователя не может быть пустым', 400, 'INVALID_USER_ID');
    }

    if (!config.JWT_SECRET || config.JWT_SECRET === 'your-secret-key') {
      throw new MissingSecretError();
    }

    const accessToken = jwt.sign(
      { userId } as TokenPayload,
      config.JWT_SECRET,
      accessTokenOptions
    );

    const refreshToken = jwt.sign
      ({ userId } as TokenPayload,
      config.JWT_SECRET,
      refreshTokenOptions
    );

    return { accessToken, refreshToken };
  }, 'generateTokens');
};

export const verifyToken = (token: string): TokenPayload | null => {
  if (!token) {
    throw new InvalidTokenError();
  }

  return handleJwtOperation(() => {
    try {
      return jwt.verify(token, config.JWT_SECRET, {
        algorithms: ['HS256']
      }) as TokenPayload;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new TokenExpiredError();
      }
      throw error;
    }
  }, 'verifyToken');
};

export const getTokenExpiry = (): number => {
  return REFRESH_TOKEN_EXPIRY_MS; 
};
