import { config } from '../config';
import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError, SignOptions } from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/un-authorized-error';
import cookieParser from 'cookie-parser';

// Импортируем ms и его типы
import ms from 'ms';
import type { StringValue } from 'ms';

interface AuthRequest extends Request {
  user?: { userId: string };
  newAccessToken?: string;
}

export const cookieMiddleware = cookieParser();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authReq = req as AuthRequest;

  // 1. Проверяем наличие заголовка Authorization
  const authHeader = authReq.headers.authorization;
  if (!authHeader) {
    return next(new UnauthorizedError('Токен доступа отсутствует'));
  }

  // 2. Извлекаем токен
  const bearerMatch = authHeader.trim().match(/^Bearer\s+(.*)$/i);
  if (!bearerMatch) {
    return next(new UnauthorizedError('Неверный формат заголовка Authorization'));
  }

  const token = bearerMatch[1].trim();
  if (!token) {
    return next(new UnauthorizedError('Токен не найден в заголовке Authorization'));
  }

  try {
    // 3. Пытаемся верифицировать токен
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string; exp?: number };

    // Если токен валиден — продолжаем обработку запроса
    if (decoded.userId) {
      authReq.user = { userId: decoded.userId };
      return next();
    }
  } catch (error) {
    // 4. Обрабатываем ошибки верификации
    if (error instanceof TokenExpiredError) {
      console.warn('⚠️ Access token просрочен. Попытка обновления...');

      // Извлекаем refreshToken из куки
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        // Если refreshToken отсутствует, продолжаем запрос без аутентификации
        console.log('⚠️ Refresh token отсутствует. Продолжаем запрос без аутентификации.');
        return next();
      }

      try {
        // Верифицируем refreshToken
        const refreshDecoded = jwt.verify(refreshToken, config.JWT_SECRET) as { userId: string };

        // Проверяем, что JWT_SECRET задан и имеет тип string
        if (!config.JWT_SECRET || typeof config.JWT_SECRET !== 'string') {
          throw new Error('JWT_SECRET не задан или имеет неверный тип в конфигурации');
        }

        // Безопасное преобразование expiresIn в нужный тип
        let expiresInValue: number | StringValue | undefined;

        const rawExpiresIn = config.AUTH_ACCESS_TOKEN_EXPIRY || '15m';

        try {
          // Явно приводим строку к StringValue
          const stringValue = rawExpiresIn as StringValue;
          // Преобразуем StringValue в число миллисекунд
          const parsedMs = ms(stringValue);

          if (!isNaN(parsedMs)) {
            expiresInValue = parsedMs; // number (миллисекунды)
          } else {
            // Если парсинг не удался, используем исходный StringValue
            expiresInValue = stringValue;
          }
        } catch {
          // В случае любой ошибки используем исходный StringValue
          expiresInValue = rawExpiresIn as StringValue;
        }

        // Явно задаём опции для jwt.sign
        const signOptions: SignOptions = {
          expiresIn: expiresInValue,
          algorithm: 'HS256'
        };

        // Генерируем новый accessToken
        const newAccessToken = jwt.sign(
          { userId: refreshDecoded.userId },
          config.JWT_SECRET,
          signOptions
        );

        // Сохраняем новый токен для передачи фронтенду
        authReq.newAccessToken = newAccessToken;

        // Устанавливаем новый токен в заголовок для текущей обработки
        authReq.headers.authorization = `Bearer ${newAccessToken}`;

        // Повторно запускаем верификацию с новым токеном
        const decodedNew = jwt.verify(newAccessToken, config.JWT_SECRET) as { userId: string };
        authReq.user = { userId: decodedNew.userId };

        console.log('✅ Access token успешно обновлён для пользователя:', decodedNew.userId);
        return next();
      } catch (refreshError) {
        console.error('❌ Ошибка верификации refreshToken:', refreshError);
        // При ошибке верификации refreshToken продолжаем запрос без аутентификации
        console.log('⚠️ Продолжаем запрос без аутентификации из‑за ошибки refreshToken.');
        return next();
      }
    } else if (error instanceof JsonWebTokenError) {
      console.error('❌ Неверный токен:', error.message);
      // При неверном токене продолжаем запрос без аутентификации для публичных операций
      return next();
    } else {
      console.error('❌ Критическая ошибка JWT:', error);
      return next(new UnauthorizedError('Ошибка проверки токена'));
    }
  }
};
