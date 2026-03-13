import 'dotenv/config';
import path from 'path';

const CURRENT_FILE_PATH = __filename;
const CURRENT_DIR = __dirname;
const SRC_DIR = path.join(CURRENT_DIR, '..');

// Валидация JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    '❌ Критическая ошибка: JWT_SECRET не установлен в переменных окружения!\n' +
    'Создайте файл .env и добавьте JWT_SECRET=ваш_секретный_ключ\n' +
    'Или установите переменную окружения перед запуском приложения.'
  );
}

if (JWT_SECRET.length < 32) {
  console.warn(
    '⚠️ Предупреждение: JWT_SECRET короче 32 символов. Рекомендуется использовать более длинный ключ для безопасности.'
  );
}

console.log('✅ JWT_SECRET загружен (длина:', JWT_SECRET.length, 'символов)');

const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_ADDRESS = process.env.DB_ADDRESS || 'mongodb://127.0.0.1:27017/weblarek';
const ORIGIN_ALLOW = process.env.ORIGIN_ALLOW || 'http://localhost:5173';
const UPLOAD_PATH = process.env.UPLOAD_PATH || 'images';
const UPLOAD_PATH_TEMP = process.env.UPLOAD_PATH_TEMP || 'temp';

// Абсолютные пути
const TEMP_UPLOAD_DIR = path.join(SRC_DIR, 'public', UPLOAD_PATH_TEMP, 'uploads');
const PUBLIC_DIR = path.join(SRC_DIR, 'public', UPLOAD_PATH);

export const config = {
  PORT,
  DB_ADDRESS,
  ORIGIN_ALLOW,
  UPLOAD_PATH,
  UPLOAD_PATH_TEMP,
  JWT_SECRET,
  AUTH_ACCESS_TOKEN_EXPIRY: process.env.AUTH_ACCESS_TOKEN_EXPIRY || '15m',
  AUTH_REFRESH_TOKEN_EXPIRY: process.env.AUTH_REFRESH_TOKEN_EXPIRY || '7d',
  TEMP_UPLOAD_DIR,
  PUBLIC_DIR,

  // Отладочная информация (только для dev)
  get JWT_SECRET_DEBUG() {
    return process.env.NODE_ENV !== 'production'
      ? this.JWT_SECRET
      : '*******';
  }
};
