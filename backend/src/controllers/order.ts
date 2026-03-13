import { Request, Response, NextFunction } from 'express';
import Product from '../models/product';
import { faker } from '@faker-js/faker';
import { BadRequestError, InternalServerError } from '../errors';

interface OrderRequest {
  payment: 'card' | 'online';
  email: string;
  phone: string;
  address: string;
  total: number;
  items: string[];
}

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { payment, email, phone, address, total, items } = req.body as OrderRequest;

    // Получаем товары из базы данных
    const products = await Product.find({ _id: { $in: items } });

    // Проверяем, что все ID существуют
    if (products.length !== items.length) {
      return next(new BadRequestError('Один или несколько ID товаров не существуют'));
    }

    // Проверяем, что все товары продаются (price не null)
    const unavailableProducts = products.filter(product => product.price === null);
    if (unavailableProducts.length > 0) {
      return next(new BadRequestError('Один или несколько товаров недоступны для продажи'));
    }

    // Считаем общую сумму товаров
    const calculatedTotal = products.reduce((sum, product) => sum + (product.price || 0), 0);

    // Сравниваем с переданной суммой
    if (calculatedTotal !== total) {
      return next(
        new BadRequestError(`Несоответствие суммы. Ожидалось ${calculatedTotal}, получено ${total}`)
      );
    }

    // Генерируем ID заказа
    const orderId = faker.string.uuid();

    // Возвращаем ответ
    res.status(201).json({
      id: orderId,
      total: total
    });
  } catch (error) {
    console.error('❌ Ошибка при создании заказа:', error);
    next(new InternalServerError('Не удалось создать заказ'));
  }
};
