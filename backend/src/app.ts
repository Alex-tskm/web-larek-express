import { config } from './config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { requestLogger, errorLogger } from './middleware/logger';

// Импортируем роутеры
import productRouter from './routes/product';
import orderRouter from './routes/order';
import authRouter from './routes/auth';
import uploadRouter from './routes/upload';

import { errorHandler } from './middleware/error-handler';
import cookieParser from 'cookie-parser';
import { NotFoundError } from './errors/not-found-error';

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // ограничение на 100 запросов за окно
  message: 'Слишком много запросов с этого IP, пожалуйста, попробуйте позже',
  standardHeaders: true, // возвращаем информацию о лимите в заголовках
  legacyHeaders: false, // отключаем устаревшие заголовки
});

app.use(limiter);

// Настройка CORS с ограничением источников
app.use(cors({
  origin: config.ORIGIN_ALLOW,
  credentials: true
}));

// Парсинг JSON
app.use(express.json());

// Логгер запросов
app.use(requestLogger);

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieParser()); 

// Подключение роутеров с уникальными префиксами
app.use(productRouter); //'/api/products',
app.use(orderRouter); //'/api/orders',
app.use('/auth', authRouter);   
app.use('/upload',uploadRouter); 

// Базовый маршрут для проверки
app.get('/', (req, res) => {
  res.send('Сервер запущен!');
});

// Обработка 404 для несуществующих маршрутов
app.all('/*splat', (req, res, next) => {
  const error = new NotFoundError(`Route not found: ${req.path}`);
  next(error);
});

// Логгер ошибок
app.use(errorLogger);

// Подключение мидлвара обработки ошибок — должен быть ПОСЛЕ всех роутеров
app.use(errorHandler);

// Подключение к MongoDB с обработкой ошибок
mongoose.connect(config.DB_ADDRESS!)
  .then(() => {
    console.log('✅ Успешно подключено к MongoDB');
    // Запуск сервера только после успешного подключения к БД
    app.listen(config.PORT, () => {
      console.log(`✅ Сервер запущен на http://localhost:${config.PORT}`);
      console.log(`🔗 База данных: ${config.DB_ADDRESS}`);
      console.log(`🔐 JWT_SECRET установлен (длина: ${config.JWT_SECRET.length} символов)`);
    });
  })
  .catch((err) => {
    console.error('❌ Ошибка подключения к MongoDB:', err);
    process.exit(1); // Завершаем процесс при ошибке подключения
  });

export default app;
