import { Router, Request, Response } from 'express';
import { createOrder } from '../controllers/order';
import { celebrate, Joi } from 'celebrate';
import { orderSchema } from '../validators/order';

const router = Router();

// POST /order — создание заказа
router.post(
  '/order',
  celebrate({
    body: orderSchema
  }),
  createOrder
);

export default router;
