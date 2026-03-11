import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Интерфейс для документа пользователя
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  tokens: { token: string }[];
  comparePassword: (candidatePassword: string) => Promise<boolean>;
}


// Схема пользователя
const userSchema = new Schema<IUser>({
  name: {
    type: String,
    minlength: [2, 'Минимальная длина имени — 2 символа'],
    maxlength: [30, 'Максимальная длина имени — 30 символов'],
    default: 'Ё-мое'
  },
  email: {
    type: String,
    required: [true, 'Email обязателен для регистрации'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Введите корректный email'],
    index: true // 🔧 Явно указываем индекс для unique
  },
  password: {
    type: String,
    required: [true, 'Пароль обязателен'],
    minlength: [6, 'Пароль должен содержать минимум 6 символов'],
    select: false
  },
  tokens: {
    type: [{
      token: {
        type: String,
        required: true
      }
    }],
    select: false, 
    default: []
  }
});

// 🔧 Middleware: хешируем пароль перед сохранением
userSchema.pre('save', async function(next) {
  // Если пароль не менялся, пропускаем
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Генерируем соль и хешируем пароль
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as any);
  }
});

// 🔧 Метод для сравнения паролей с обработкой ошибок
userSchema.methods.comparePassword = async function(
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('❌ Ошибка в comparePassword:', error);
    return false;
  }
};

// 🔧 Добавляем индекс для email (гарантирует уникальность)
userSchema.index({ email: 1 }, { unique: true });

export default mongoose.model<IUser>('User', userSchema);
