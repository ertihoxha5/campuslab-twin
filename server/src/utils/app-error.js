export class AppError extends Error {
  constructor({ status = 400, code, message, details }) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.publicMessage = message;
    this.details = details;
  }
}
