export class ApiError extends Error {
  code: number;

  constructor({ code, message }) {
    const fullMsg = `${code}: ${message}`;

    super(fullMsg);
    this.code = code;
    this.message = message;
  }
}

