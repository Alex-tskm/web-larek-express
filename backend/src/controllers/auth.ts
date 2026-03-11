import mongoose from 'mongoose';
import { Request, Response, NextFunction } from "express";
import User, { IUser } from "../models/user";
import { generateTokens, verifyToken, getTokenExpiry } from "../utils/jwt";
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';

import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  InternalServerError,
} from "../errors";

// Регистрация пользователя
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // 🔧 Логирование входящих данных
    console.log('🔎 Регистрация: получены данные:', { name, email });

    if (!name || !email || !password) {
      return next(new BadRequestError("Имя, email и пароль обязательны"));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(
        new ConflictError("Пользователь с таким email уже существует"),
      );
    }

    const user = new User({
      name,
      email,
      password,
      tokens: [] 
    }); 
    
    // 🔧 Проверка подключения к БД
    if (mongoose.connection.readyState !== 1) {
      console.error('❌ БД не подключена!');
      return next(new InternalServerError("Сервис временно недоступен"));
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    user.tokens.push({ token: refreshToken });
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: getTokenExpiry(),
      path: "/",
    });

    res.status(201).json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name
      },
      success: true,
      accessToken,
    });
  } catch (error: unknown) {
    console.error('❌ Ошибка в register:', error); // 🔧 Детализация ошибки
    next(new InternalServerError("Ошибка при регистрации"));
  }
};

// Авторизация пользователя
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    console.log('🔎 Авторизация: получены данные:', { email, passwordLength: password?.length });

    if (!email || !password) {
      return next(new BadRequestError("Email и пароль обязательны"));
    }

    console.log('👤 Ищем пользователя с email:', email);

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      console.log('❌ Пользователь с email', email, 'не найден');
      return next(new UnauthorizedError("Неверный email или пароль"));
    }

    console.log('✅ Пользователь найден:', user._id);

    // 🔧 Проверка метода comparePassword
    try {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        console.log('❌ Пароль не совпадает для пользователя', user._id);
        return next(new UnauthorizedError("Неверный email или пароль"));
      }
    } catch (compareError) {
      console.error('❌ Ошибка сравнения паролей:', compareError);
      return next(new InternalServerError("Ошибка проверки пароля"));
    }

    console.log('🔑 Пароли совпадают, генерируем токены...');

    // 🔧 Логирование генерации токенов
    console.log('🔐 Генерируем токены для пользователя:', user._id);
    const tokens = generateTokens(user._id.toString());
    console.log('✅ Токены сгенерированы:', {
      accessTokenLength: tokens.accessToken?.length,
      refreshTokenLength: tokens.refreshToken?.length
    });
    const { accessToken, refreshToken } = tokens;

    user.tokens = (user.tokens || []).filter((t) => t.token !== refreshToken);
    user.tokens.push({ token: refreshToken });

    try {
      await user.save();
      console.log('✅ Пользователь сохранён с новым токеном');
    } catch (saveError) {
      console.error('❌ Ошибка сохранения пользователя:', saveError);
      return next(new InternalServerError("Ошибка при сохранении токена"));
    }

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: getTokenExpiry(),
      path: "/",
    });

    console.log('🍪 Кука refreshToken установлена');

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name
      },
      success: true,
      accessToken,
    });
  } catch (error: unknown) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА в login:', error); // 🔧 Детализация ошибки

    if (error instanceof BadRequestError ||
        error instanceof UnauthorizedError ||
        error instanceof InternalServerError) {
      next(error);
    } else {
      // 🔧 В dev‑режиме показываем реальную ошибку
      const errorMessage = process.env.NODE_ENV === 'development'
        ? (error as Error).message
        : "Ошибка при авторизации";
      next(new InternalServerError(errorMessage));
    }
  }
};

// Получение текущего пользователя по токену
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new UnauthorizedError("Access token отсутствует"));
    }

    const accessToken = authHeader.replace("Bearer ", "");

    try {
      const payload = verifyToken(accessToken);

      if (!payload || !payload.userId) {
        return next(new UnauthorizedError("Invalid access token"));
      }

      const user = await User.findById(payload.userId).select(
        "-password -tokens"
      );
      if (!user) {
        return next(new NotFoundError("Пользователь не найден"));
      }

      res.json({
        user: {
          _id: user._id,
          email: user.email,
          name: user.name
        },
        success: true,
      });
    } catch (jwtError) {
      if (jwtError instanceof TokenExpiredError) {
        return next(new UnauthorizedError("Access token просрочен"));
      } else {
        return next(new UnauthorizedError("Неверный access token"));
      }
    }
  } catch (error: unknown) {
    next(new BadRequestError("Ошибка при получении информации о пользователе"));
  }
};

// Обновление access‑токена по refresh‑токену
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Получаем refreshToken из cookies
    const refreshToken = req.cookies?.refreshToken;

    // Проверка наличия refreshToken
    if (!refreshToken) {
      console.warn('⚠️ refreshToken отсутствует в cookies');
      return next(new UnauthorizedError("Refresh token отсутствует"));
    }

    let payload;
    try {
      // Проверяем refreshToken через утилиту verifyToken
      payload = verifyToken(refreshToken);
    } catch (jwtError) {
      if (jwtError instanceof TokenExpiredError) {
        // Если токен просрочен — очищаем куку и возвращаем ошибку
        res.clearCookie("refreshToken", {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/"
        });
        console.warn('⚠️ Refresh token просрочен, кука очищена');
        return next(new UnauthorizedError("Refresh token просрочен. Требуется повторная авторизация"));
      } else if (jwtError instanceof JsonWebTokenError) {
        // Неверный формат токена
        return next(new UnauthorizedError("Неверный refresh token"));
      } else {
        // Другие ошибки JWT
        console.error('❌ Ошибка JWT при проверке refreshToken:', jwtError);
        return next(new UnauthorizedError("Ошибка проверки refresh token"));
      }
    }

    // Дополнительная проверка payload
    if (!payload || !payload.userId) {
      return next(new UnauthorizedError("Invalid refresh token: отсутствует userId"));
    }

    // Ищем пользователя в БД
    const user = await User.findById(payload.userId).select("+tokens");
    if (!user) {
      return next(new NotFoundError("Пользователь не найден"));
    }

    // Проверяем, что токен есть в БД и не отозван
    const tokenRecord = user.tokens.find((t) => t.token === refreshToken);
    if (!tokenRecord) {
      return next(new UnauthorizedError("Refresh token не найден или отозван"));
    }

    // Генерируем новую пару токенов
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      generateTokens(user._id.toString());

    // Обновляем массив токенов: удаляем старый, добавляем новый
    user.tokens = user.tokens.filter((t) => t.token !== refreshToken);
    user.tokens.push({ token: newRefreshToken });

    await user.save();

    // Устанавливаем новую куку с refresh‑токеном
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: getTokenExpiry(),
      path: "/"
    });

    res.json({
      user: {
        _id: user._id,
        email: user.email,
        name: user.name
      },
      success: true,
      accessToken: newAccessToken
    });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
      next(error);
    } else {
      console.error("❌ Неожиданная ошибка в refreshAccessToken:", error);
      next(new BadRequestError("Ошибка при обновлении токенов"));
    }
  }
};

// Выход пользователя
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return next(new UnauthorizedError('Refresh token отсутствует'));
    }

    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch (jwtError) {
      // Безопасное получение сообщения об ошибке
      const errorMessage = (jwtError as Error).message || 'Неизвестная ошибка JWT';
      console.log('⚠️ Предупреждение: токен при logout имеет проблемы:', errorMessage);
      // Продолжаем выполнение — нам нужно удалить токен из БД и куки
    }

    // Если payload не удалось получить, но токен есть в куках — всё равно пытаемся удалить его из БД
    if (!payload || !payload.userId) {
      console.log('🔎 Токен не прошёл верификацию, но продолжаем logout для очистки');
    }

    const userId = payload?.userId;

    // Ищем пользователя независимо от валидности токена — нам нужно очистить данные
    const user = await User.findById(userId).select('+tokens');

    if (user) {
      // Удаляем refresh‑токен из массива токенов пользователя
      user.tokens = user.tokens.filter((t) => t.token !== refreshToken);

      try {
        await user.save();
        console.log(`✅ Токены пользователя ${user._id} обновлены после logout`);
      } catch (saveError) {
        console.error('❌ Ошибка при сохранении изменений после logout:', saveError);
        return next(new InternalServerError('Ошибка при удалении токена'));
      }
    } else {
      console.log('👤 Пользователь не найден при logout, продолжаем очистку куки');
    }

    // Очищаем куку refreshToken (устанавливаем с истекшим сроком действия)
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    console.log('🍪 Кука refreshToken очищена');

    res.json({
      success: true,
      message: 'Выход выполнен успешно',
    });
  } catch (error: unknown) {
    if (error instanceof BadRequestError || error instanceof NotFoundError) {
      next(error);
    } else {
      const errorMessage = (error as Error).message || 'Неожиданная ошибка';
      console.error('❌ Неожиданная ошибка в logout:', errorMessage);
      next(new BadRequestError('Ошибка при выходе'));
    }
  }
};