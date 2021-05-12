export class FetchMediaError extends Error {
  constructor(message: string, public readonly response: Response) {
    super(message);

    Object.setPrototypeOf(this, FetchMediaError.prototype);
  }
}
