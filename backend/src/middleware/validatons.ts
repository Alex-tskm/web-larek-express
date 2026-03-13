import { Segments, celebrate, Joi } from 'celebrate';
import { productIdSchema, createProductSchema, updateProductSchema } from '../validators/validatons';

// Валидация ID из параметров URL
export const validateProductId = celebrate({
  params: productIdSchema
}, {
  abortEarly: false,
  allowUnknown: false
});

// Валидация тела запроса при создании товара
export const validateCreateProductBody = celebrate({
  body: createProductSchema
}, {
  abortEarly: false,
  allowUnknown: true // Разрешаем неизвестные поля (например, image от multer)
});

// Валидация тела запроса при обновлении товара
export const validateUpdateProductBody = celebrate({
  body: updateProductSchema
}, {
  abortEarly: false,
  allowUnknown: true // Аналогично — разрешаем неизвестные поля
});

const validateAuth = celebrate({
  [Segments.BODY]: Joi.object().keys({
    email: Joi.string()
      .required()
      .email()
      .message('Поле "email" должно быть валидным email-адресом')
      .messages({
        'string.required': 'Поле "email" должно быть заполнено',
      }),
    password: Joi.string().required().messages({
      'string.empty': 'Поле "password" должно быть заполнено',
    }),
  }),
});

