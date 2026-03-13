import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { FileService } from '../utils/service';
import { config } from '../config';
import { BadRequestError, InternalServerError } from '../errors/index';

export const uploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    console.log('📤 Начата обработка загрузки файла');

    if (!req.file) {
      console.warn('❌ Файл не был загружен — req.file отсутствует');
      return next(new BadRequestError('Файл не был загружен'));
    }

    const tempFilePath = req.file.path;
    const originalName = req.file.originalname;

    console.log('🧭 Временный файл (из req.file):', tempFilePath);
    console.log('🧭 Оригинальное имя файла:', originalName);

    // Проверяем существование временного файла
    if (!fs.existsSync(tempFilePath)) {
      console.error('❌ Временный файл не найден:', tempFilePath);
      return next(new InternalServerError('Временный файл не найден на сервере'));
    }

    try {
      // Перемещаем файл в публичную директорию
      const publicFilePath = await FileService.moveFileToPublic(
        tempFilePath,
        originalName
      );

      console.log('✅ Файл сохранён по пути:', publicFilePath);

      // Формируем объект в соответствии с ожидаемой структурой в product.ts
      const imageData = {
        fileName: publicFilePath,
        originalName: originalName
      };

      return res.status(200).json({
        message: 'Файл успешно загружен',
        image: imageData,
        fileSize: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (fileError: unknown) {
      console.error('❌ Ошибка при перемещении файла:', fileError);

      let errorMessage: string;

      // Безопасная проверка типа ошибки
      if (fileError instanceof Error) {
        errorMessage = fileError.message;
      } else if (typeof fileError === 'string') {
        errorMessage = fileError;
      } else {
        errorMessage = 'Во время загрузки файла произошла неизвестная ошибка';
      }

      // Пытаемся удалить временный файл при ошибке
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log('🗑️ Временный файл удалён после ошибки');
        }
      } catch (cleanupError: unknown) {
        console.error('⚠️ Ошибка при удалении временного файла:', cleanupError);
      }

      return next(
        new InternalServerError(`Ошибка при сохранении файла на сервере: ${errorMessage}`)
      );
    }
  } catch (error) {
    console.error('❌ Критическая ошибка загрузки файла:', error);

    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = 'Неизвестная критическая ошибка при загрузке файла';
    }

    return next(
      new InternalServerError(`Критическая ошибка загрузки файла: ${errorMessage}`)
    );
  }
};
