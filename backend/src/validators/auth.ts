import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(30)
    .optional()
    .default('Ё-мое')
    .messages({
      'string.min': 'Минимальная длина имени — 2 символа',
      'string.max': 'Максимальная длина имени — 30 символов'
    }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Введите корректный email',
      'any.required': 'Email обязателен'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Пароль должен содержать минимум 6 символов',
      'any.required': 'Пароль обязателен'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Введите корректный email',
      'any.required': 'Email обязателен'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Пароль должен содержать минимум 6 символов',
      'any.required': 'Пароль обязателен'
    })
});
