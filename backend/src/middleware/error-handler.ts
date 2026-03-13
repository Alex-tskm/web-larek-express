import { ErrorRequestHandler } from 'express';
import multer from 'multer';
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  InternalServerError
} from '../errors/index';

/**
 * Тип‑гард для проверки, является ли ошибка ошибкой Multer
 *
 * @param error — неизвестный объект ошибки
 * @returns true, если ошибка соответствует структуре MulterError
 */
function isMulterError(error: unknown): error is multer.MulterError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'field' in error
  );
}

/**
 * Возвращает читаемое сообщение об ошибке на основе кода ошибки Multer
 *
 * @param code — код ошибки Multer (например, 'LIMIT_FILE_SIZE')
 * @returns читаемое сообщение для пользователя
 */
function getMulterErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'LIMIT_FILE_SIZE': 'Размер файла превышает допустимый лимит (максимум 5 МБ)',
    'LIMIT_FILE_COUNT': 'Превышено количество загружаемых файлов (разрешён 1 файл)',
    'LIMIT_FIELD_KEY': 'Ошибка в данных формы (некорректное имя поля)',
    'LIMIT_FIELD_VALUE': 'Ошибка в данных формы (некорректное значение поля)',
    'LIMIT_FIELD_COUNT': 'Превышено количество полей в форме',
    'LIMIT_PART_COUNT': 'Превышено количество частей в запросе',
    'UNEXPECTED_FIELD': 'Неожиданное поле в запросе (ожидается поле "file")'
  };

  return messages[code] || 'Произошла ошибка при загрузке файла';
}

/**
 * Глобальный обработчик ошибок для Express‑приложения
 *
 * Обрабатывает все типы ошибок, возникающих в приложении:
 * - ошибки Multer (валидация файлов)
 * - кастомные ошибки API (ApiError и его наследники)
 * - ошибки MongoDB (дублирование уникальных полей)
 * - непредвиденные ошибки
 *
 * Логирует ошибки с учётом окружения (в development показывает stack trace)
 * и возвращает структурированные JSON‑ответы клиенту.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  // Логируем ошибку для отладки (но не отдаём детали клиенту)
  console.error('Error occurred:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // Обработка ошибок Multer
  if (isMulterError(error)) {
    res.status(400).json({
      error: 'Ошибка загрузки файла',
      details: getMulterErrorMessage(error.code),
      code: error.code,
      field: error.field
    });
    return;
  }

  // Обработка кастомных ошибок приложения (ApiError и наследники)
  if (error instanceof ApiError) {
    res.status(error.status).json({
      message: error.message,
      ...(error.code && { code: error.code }) // добавляем code, если он есть
    });
    return;
  }

  // Обработка ошибок MongoDB (дублирование уникального поля)
  if (error instanceof Error && error.message.includes('E11000')) {
    res.status(409).json({
      message: 'Ресурс с такими данными уже существует'
    });
    return;
  }

  // Обработка ошибки отсутствия файла (специальный случай из uploadFile)
  if (error instanceof Error && error.message === 'Файл не был загружен') {
    res.status(400).json({
      message: 'Файл не был загружен'
    });
    return;
  }

  // Непредвиденные ошибки — возвращаем 500
  res.status(500).json({
    message: 'Внутренняя ошибка сервера'
  });
};
