import { Router, Request, Response } from 'express';
import { createOrder } from '../controllers/order';

const router = Router();

// POST /order — создание заказа
router.post('/order', createOrder);

export default router;
