import { FetchMediaError } from './FetchMediaError';
import type { CompatibleResponse } from './MediaResponse';

export class TextError extends FetchMediaError {
  constructor(
    response: CompatibleResponse | { status: number; statusText: string; url: string },
    public readonly data: string
  ) {
    super(TextError.getError(response, data), response);

    Object.setPrototypeOf(this, TextError.prototype);
  }

  private static getError(
    response: Response | { status: number; statusText: string; url: string },
    data: string
  ): string {
    return `[${response.status}] ${response.url}
    Expected a structured error or problem, but got text:
    ${data}`;
  }
}
