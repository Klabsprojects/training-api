class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = options.isOperational ?? true; // safe to show to client
  }
}

module.exports = AppError;