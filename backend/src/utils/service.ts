import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { config } from '../config';

const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);

export class FileService {
  static async moveFileToPublic(
    tempFilePath: string,
    originalName: string
  ): Promise<{ fileName: string; originalName: string }> {
    try {
      // Целевая директория — внутри public
      const publicDir = path.join(__dirname, '../../src/public', config.UPLOAD_PATH);

      // Создаём целевую директорию, если не существует
      await mkdir(publicDir, { recursive: true });

      // Генерируем уникальное имя файла
      const extension = path.extname(originalName);
      const uniqueFileName = `${Date.now()}${extension}`;
      const targetPath = path.join(publicDir, uniqueFileName);

      // Перемещаем файл из временной директории в публичную
      await rename(tempFilePath, targetPath);

      console.log('✅ Файл успешно перемещён:', targetPath);

      // Формируем путь относительно public: /images/17123456789.jpg
      const relativePath = `/${config.UPLOAD_PATH}/${uniqueFileName}`;

      return {
        fileName: relativePath,       // Путь вида: /images/17123456789.jpg
        originalName: originalName      // Оригинальное имя файла
      };
    } catch (error) {
      console.error('❌ Ошибка перемещения файла:', error);
      throw error;
    }
  }

  static deleteFile(filePath: string): void {
    try {
      const fullPath = path.join(__dirname, '../../src/public', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log('✅ Файл удалён:', fullPath);
      }
    } catch (error) {
      console.error('❌ Ошибка удаления файла:', error);
    }
  }
}
