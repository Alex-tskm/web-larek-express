import Joi from 'joi';

export const productIdSchema = Joi.object({
  productId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.base': 'ID товара должен быть строкой',
      'string.hex': 'ID товара должен быть валидным hex‑строкой',
      'string.length': 'ID товара должен содержать 24 символа',
      'any.required': 'ID товара обязателен'
    })
});

// Схема для создания товара — без обязательного image в теле
export const createProductSchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(30)
    .required()
    .messages({
      'string.min': 'Минимальная длина поля "title" — 2 символа',
      'string.max': 'Максимальная длина поля "title" — 30 символов',
      'any.required': 'Поле "title" должно быть заполнено'
    }),
  category: Joi.string()
    .required()
    .messages({
      'any.required': 'Поле "category" должно быть заполнено'
    }),
  description: Joi.string()
    .allow('')
    .optional(),
  price: Joi.number()
    .positive()
    .optional() // Сделаем необязательным для гибкости
    .messages({
      'number.base': 'Цена должна быть числом',
      'number.positive': 'Цена должна быть положительным числом'
    })
  // image не включаем — обрабатывается через multer
});

// Схема для обновления товара — все поля опциональны
export const updateProductSchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(30)
    .optional()
    .messages({
      'string.min': 'Минимальная длина поля "title" — 2 символа',
      'string.max': 'Максимальная длина поля "title" — 30 символов'
    }),
  category: Joi.string().optional(),
  description: Joi.string().allow('').optional(),
  price: Joi.number().positive().optional()
  // image не включаем — обрабатывается отдельно
});
