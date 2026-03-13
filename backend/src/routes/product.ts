import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/product';
import {
  validateProductId,
  validateCreateProductBody,
  validateUpdateProductBody
} from '../middleware/validatons';
import upload from '../middleware/file'; // Импортируем готовый middleware

const router = Router();

// Получение всех товаров — без авторизации
router.get('/product', getProduct);

// Создание товара — защищённый маршрут
router.post(
  '/product',
  authMiddleware,
  upload.single('file'),
  validateCreateProductBody,
  createProduct
);

// Обновление товара — защищённый маршрут
router.patch(
  '/product/:productId',
  authMiddleware,
  validateProductId,
  upload.single('file'),
  validateUpdateProductBody,
  updateProduct
);

// Удаление товара — защищённый маршрут
router.delete(
  '/product/:productId',
  authMiddleware,
  validateProductId,
  deleteProduct
);

export default router;
