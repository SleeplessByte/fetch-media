import type { CompatibleResponse } from './MediaResponse';

export class FetchMediaError extends Error {
  constructor(
    message: string,
    public readonly response: CompatibleResponse | { status: number; statusText: string }
  ) {
    super(message);

    Object.setPrototypeOf(this, FetchMediaError.prototype);
  }
}
