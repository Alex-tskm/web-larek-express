import { config } from './config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { requestLogger, errorLogger } from './middleware/logger';

// Импортируем роутеры
import productRouter from './routes/product';
import orderRouter from './routes/order';
import authRouter from './routes/auth';
import uploadRouter from './routes/upload';

import { errorHandler } from './middleware/error-handler';
import cookieParser from 'cookie-parser';

const app = express();

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
app.all('/*splat', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Логгер ошибок
app.use(errorLogger);

// Глобальный обработчик ошибок
app.use((error: Error, req: express.Request, res: express.Response, next: any) => {
  console.error('❌ Глобальная ошибка:', error);
  console.error('Маршрут:', req.method, req.originalUrl);
  console.error('Заголовки:', req.headers);
  console.error('Тело запроса:', req.body);

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

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
