export class AppError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class BadRequest extends AppError {
  constructor(message: string = "Bad request") {
    super(message, 400)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404)
  }
}

export class Unauthorized extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401)
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflict error") {
    super(message, 409)
  }
}
