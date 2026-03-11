import express from 'express';
import multer from 'multer';
import fileMiddleware from '../middleware/file';
import { authMiddleware } from '../middleware/auth';
import { uploadFile } from '../controllers/upload';

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  fileMiddleware.single('file'), 
  uploadFile
);

// Обработчик ошибок Multer
router.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    console.error('❌ Ошибка Multer:', err);
    res.status(400).json({
      error: 'Ошибка загрузки файла',
      details: err.message,
      code: err.code
    });
  } else {
    next(err);
  }
});

export default router;
