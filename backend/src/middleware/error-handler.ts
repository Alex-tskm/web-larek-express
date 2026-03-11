import { ErrorRequestHandler } from 'express';
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  ConflictError,
  InternalServerError
} from '../errors/index';

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  // Логируем ошибку для отладки (но не отдаём детали клиенту)
  console.error('Error occurred:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  if (error instanceof ApiError) {
    res.status(error.status).json({
      message: error.message
    });
  } else if (error instanceof Error && error.message.includes('E11000')) {
    // Ошибка дублирования уникального поля (MongoDB)
    res.status(409).json({
      message: 'Ресурс с такими данными уже существует'
    });
  } else {
    // Непредвиденные ошибки — возвращаем 500
    res.status(500).json({
      message: 'Внутренняя ошибка сервера'
    });
  }
};
