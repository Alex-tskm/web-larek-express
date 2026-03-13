import { Request, Response, NextFunction } from 'express';
import Product, { IProduct } from '../models/product';
import mongoose, { Error as MongooseError } from 'mongoose';
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  NotFoundError
} from '../errors';
import { FileService } from '../utils/service';

// Получение всех продуктов
export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const products = await Product.find();
    const total = products.length;

    res.json({
      items: products,
      total: total
    });
  } catch (error: unknown) {
    next(new InternalServerError('Ошибка при получении продуктов'));
  }
};

// Создание продукта
export const createProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  console.log('🚀 Создание нового продукта:', req.body);

  try {
    const { title, category, description, price } = req.body;
    let imageData = req.body.image;

    console.log('🔍 Данные изображения:', imageData);

    // Извлекаем данные изображения из вложенной структуры
    if (imageData && typeof imageData === 'object') {
      // Если есть вложенный объект image — берём его
      if (imageData.image) {
        imageData = imageData.image.fileName;
        console.log('🔍 Извлечение image из вложенного объекта:', imageData);        
      }
    }

    // Валидация изображения
    if (!imageData) {
      return next(new BadRequestError('Поле image отсутствует в запросе'));
    }

    if (!imageData.fileName || !imageData.originalName) {
      return next(new BadRequestError(
        'Объект image должен содержать поля fileName и originalName'
      ));
    } 

    // Создаём продукт с корректными данными изображения
    const productData: IProduct = {
      title,
      image: {
        fileName: imageData.fileName,
        originalName: imageData.originalName
      },
      category,
      description,
      price
    };

    const product = new Product(productData);
    await product.save();

    // Формируем ответ на основе модели Product, добавляя _id как строку
    const responseData = {
      _id: product._id.toString(),
      title: product.title,
      image: product.image,
      category: product.category,
      description: product.description ?? '',
      price: product.price ?? null
    };    

    return res.status(201).json(responseData);
  } catch (error: unknown) {
    console.error('❌ Ошибка создания товара:', error);

    if (error instanceof Error && error.message.includes('E11000')) {
      next(new ConflictError('Продукт с таким названием уже существует'));
    } else if (isMongooseValidationError(error)) {
      const validationErrors = extractValidationErrors(error);
      next(new BadRequestError(`Ошибки валидации при создании: ${validationErrors}`));
    } else {
      next(new InternalServerError('Ошибка при создании товара'));
    }
  }
};

// Обновление продукта
export const updateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId } = req.params;

    // Ищем существующий товар
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return next(new NotFoundError('Товар не найден'));
    }

    let updates = { ...req.body };

    // Обработка изображения из req.body, если поле присутствует
    if (req.body.image !== undefined) {
      const rawImageData = req.body.image;

      // Извлекаем данные из структуры: req.body.image.image.fileName
      if (rawImageData.image &&
          rawImageData.image.fileName &&
          rawImageData.image.fileName.fileName &&
          rawImageData.image.fileName.originalName) {

        const imageData = {
          fileName: rawImageData.image.fileName.fileName,
          originalName: rawImageData.image.fileName.originalName
        };

        // Валидация извлечённых данных изображения
        if (!imageData.fileName || !imageData.originalName) {
          return next(new BadRequestError(
            'Некорректный формат данных изображения. Объект image должен содержать поля fileName и originalName'
          ));
        }

        // Обновляем данные изображения в updates
        updates.image = imageData;
      } else {
        return next(new BadRequestError(
          'Некорректная структура данных изображения. Ожидаемая структура: req.body.image.image.fileName.{fileName, originalName}'
        ));
      }
    }

    // Обновляем товар
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return next(new NotFoundError('Товар не найден после обновления'));
    }

    // Формируем ответ на основе модели Product, добавляя _id как строку
    const responseData = {
      _id: updatedProduct._id.toString(),
      title: updatedProduct.title,
      image: updatedProduct.image,
      category: updatedProduct.category,
      description: updatedProduct.description ?? '',
      price: updatedProduct.price ?? null
    };

    res.json(responseData);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('E11000')) {
      return next(new ConflictError('Продукт с таким названием уже существует'));
    }

    if (isMongooseValidationError(error)) {
      const validationErrors = extractValidationErrors(error);
      return next(new BadRequestError(`Ошибки валидации при обновлении: ${validationErrors}`));
    }

    next(new InternalServerError('Не удалось обновить продукт'));
  }
};

// Удаление продукта
export const deleteProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId } = req.params;

    const productToDelete = await Product.findById(productId);
    if (!productToDelete) {
      return next(new NotFoundError('Товар не найден'));
    }

    let fileDeletionError: Error | null = null;

    if (productToDelete.image?.fileName) {
      try {
        await FileService.deleteFile(productToDelete.image.fileName);
        console.log(`✅ Файл изображения ${productToDelete.image.fileName} успешно удалён`);
      } catch (fileError: unknown) {
        fileDeletionError = fileError instanceof Error ? fileError : new Error('Unknown file deletion error');
        console.error(`⚠️ Ошибка при удалении файла изображения ${productToDelete.image.fileName}:`, fileError);
      }
    } else {
      console.log('🔎 У товара нет изображения или fileName не указан — пропуск удаления файла');
    }

    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return next(new InternalServerError('Не удалось удалить продукт из базы данных'));
    }

    console.log(`✅ Товар ${productId} успешно удалён из базы данных`);

    // Явно объявляем тип responseData с импортом IProduct
    const responseData: {
      data: IProduct;
      message: string;
      fileDeletionError?: {
        message: string;
        stack?: string;
      };
    } = {
      data: productToDelete,
      message: 'Товар успешно удалён'
    };

    if (fileDeletionError) {
      responseData.message += '. Внимание: возникла ошибка при удалении файла изображения';
      responseData.fileDeletionError = {
        message: fileDeletionError.message,
        stack: process.env.NODE_ENV === 'development' ? fileDeletionError.stack : undefined
      };
    }

    res.status(200).json(responseData);
  } catch (error: unknown) {
    console.error('❌ Критическая ошибка при удалении продукта:', error);

    if (error instanceof mongoose.Error.CastError) {
      return next(new BadRequestError('Некорректный формат ID товара'));
    }

    next(new InternalServerError('Не удалось удалить продукт'));
  }
};

// Вспомогательная функция для проверки типа ошибки валидации Mongoose
function isMongooseValidationError(err: unknown): err is mongoose.Error.ValidationError {
  return err instanceof MongooseError && 'errors' in err;
}

// Вспомогательная функция для извлечения сообщений об ошибках валидации
function extractValidationErrors(error: mongoose.Error.ValidationError): string {
  const errorMessages: string[] = [];

  for (const field in error.errors) {
    if (error.errors[field]) {
      errorMessages.push(error.errors[field].message);
    }
  }

  return errorMessages.join(', ');
}
