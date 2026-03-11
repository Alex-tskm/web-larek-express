import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { config } from '../config';

// Корректный путь: backend/src/public/temp/uploads
const TEMP_UPLOAD_DIR = path.join(__dirname, '../../src/public', config.UPLOAD_PATH_TEMP, 'uploads');

// Создаём всю цепочку директорий, если её нет
try {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
  console.log('✅ Создана временная директория:', TEMP_UPLOAD_DIR);
} catch (err) {
  console.error('❌ Ошибка при создании временной директории:', err);
  throw err;
}

// Допустимые MIME‑типы
const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

// Настройка хранилища multer
const storage = multer.diskStorage({
  destination: (req: Express.Request, file: Express.Multer.File, cb) => {
    try {
      // Проверяем существование директории перед сохранением
      if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
        fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
        console.log('✅ Директория создана при сохранении файла:', TEMP_UPLOAD_DIR);
      }
      cb(null, TEMP_UPLOAD_DIR);
    } catch (error) {
      console.error('❌ Ошибка создания директории:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      cb(err, '');
    }
  },
  filename: (req: Express.Request, file: Express.Multer.File, cb) => {
    const uniqueSuffix = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  }
});

const fileFilter: multer.Options['fileFilter'] = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  console.log('📤 Получен файл:', {
    fieldName: file.fieldname,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  if (ACCEPTED_MIME_TYPES.includes(file.mimetype)) {
    console.log('✅ Тип файла разрешён:', file.mimetype);
    cb(null, true);
  } else {
    console.warn('❌ Недопустимый тип файла:', file.mimetype);
    cb(null, false);
    (req as any).fileValidationError = 'Недопустимый тип файла. Разрешены: JPEG, PNG, GIF, WEBP';
  }
};

// Создаём middleware с настройками
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 МБ лимит
  }
});

export default upload;
