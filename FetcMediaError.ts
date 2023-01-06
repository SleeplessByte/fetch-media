export class FetchMediaError extends Error {
  constructor(
    message: string,
    public readonly response: Response | { status: number; statusText: string }
  ) {
    super(message);

    Object.setPrototypeOf(this, FetchMediaError.prototype);
  }
}
