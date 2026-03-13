import expressWinston from 'express-winston';
import winston from 'winston';
import express from 'express'; 


const isProduction = process.env.NODE_ENV === 'production';

const consoleTransport = !isProduction
  ? [new winston.transports.Console({ format: winston.format.simple() })]
  : [];

// Логгер запросов
export const requestLogger: express.RequestHandler = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  expressWinston.logger({
    transports: [
      new winston.transports.File({
        filename: 'request.log',
        level: 'info'
      }),
      ...consoleTransport
    ],
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    meta: true,
    expressFormat: true,
    colorize: !isProduction,
    ignoreRoute: (req, res) => false,
    statusLevels: true
  })(req, res, next);
};

// Логгер ошибок
export const errorLogger: express.ErrorRequestHandler = (
  error: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  expressWinston.errorLogger({
    transports: [
      new winston.transports.File({
        filename: 'error.log',
        level: 'error'
      }),
      ...consoleTransport
    ],
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    meta: true
  })(error, req, res, next);
};
