import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { register, login, logout, getCurrentUser, refreshAccessToken } from '../controllers/auth';
import { celebrate, Joi } from 'celebrate';
import { registerSchema, loginSchema } from '../validators/auth';

const router = Router();

// Регистрация
router.post('/register',
  celebrate({
    body: registerSchema
  }),
  register
);

// Авторизация
router.post('/login',
  celebrate({
    body: loginSchema
  }),
  login
);

// Выход
router.get('/logout', authMiddleware, logout);

// Получение информации о пользователе — защищённый маршрут
router.get('/user', authMiddleware, getCurrentUser);

// Обновление access‑токена по refresh‑токену
router.get('/token', refreshAccessToken);

export default router;
