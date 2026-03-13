import express from 'express';
import fileMiddleware from '../middleware/file';
import { authMiddleware } from '../middleware/auth';
import { uploadFile } from '../controllers/upload';

const router = express.Router();

/**
 * Маршрут загрузки файла
 *
 * POST /upload/
 *
 * Обработчики:
 * 1. authMiddleware — проверка авторизации пользователя
 * 2. fileMiddleware — обработка загрузки файла через Multer:
 *    - проверка MIME‑типа (только изображения)
 *    - ограничение размера (5 МБ)
 *    - сохранение во временную директорию
 * 3. uploadFile — бизнес‑логика: перемещение файла в публичную директорию, формирование ответа
 */
router.post(
  '/',
  authMiddleware,
  fileMiddleware.single('file'),
  uploadFile
);

export default router;
