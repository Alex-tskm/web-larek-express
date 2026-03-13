import mongoose from 'mongoose';

export interface IImage {
  fileName: string;
  originalName: string;
}

export interface IProduct {
  title: string; // название товара, строка от 2 до 30 символов, обязательное, уникальное
  image: IImage; // путь до файла и метаинформация об изображении, обязательное поле
  category: string; // категория товара, обязательное поле
  description?: string; // описание товара, необязательное поле
  price?: number | null; // цена товара, необязательное поле, по умолчанию null
}

const productSchema = new mongoose.Schema<IProduct>({
  title: {
    type: String,
    required: [true, 'Название товара обязательно'],
    minlength: [2, 'Название должно содержать минимум 2 символа'],
    maxlength: [30, 'Название не может превышать 30 символов'],
    unique: true
  },
  image: {
    type: {
      fileName: {
        type: String,
        required: [true, 'Путь к файлу изображения обязателен']
      },
      originalName: {
        type: String,
        required: [true, 'Оригинальное имя файла обязательно']        
      }
    },
    required: [true, 'Изображение товара обязательно']    
  },
  category: {
    type: String,
    required: [true, 'Категория товара обязательна']
  },
  description: {
    type: String,
    required: false
  },
  price: {
    type: Number,
    required: false,
    default: null
  }
});

// Middleware для нормализации image перед сохранением
productSchema.pre('save', function(next) {
  if (!this.image) {
    this.image = {
      fileName: '',
      originalName: ''
    };
  } else {
    // Гарантируем, что оба поля присутствуют
    this.image.fileName = this.image.fileName || '';
    this.image.originalName = this.image.originalName || '';
  }
  next();
});

// Статический метод для создания продукта с нормализованным image
productSchema.statics.createWithDefaults = async function(productData: Partial<IProduct>) {
  const normalizedImage = productData.image || {
    fileName: '',
    originalName: ''
  };

  const product = new this({
    ...productData,
    image: normalizedImage
  });

  return await product.save();
};

export default mongoose.model<IProduct>('product', productSchema, 'product'); 