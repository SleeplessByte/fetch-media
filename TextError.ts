import { FetchMediaError } from './FetcMediaError';

export class TextError extends FetchMediaError {
  constructor(response: Response, public readonly data: string) {
    super(TextError.getError(response, data), response);

    Object.setPrototypeOf(this, TextError.prototype);
  }

  private static getError(response: Response, data: string): string {
    return `[${response.status}] ${response.url}
    Expected a structured error or problem, but got text:
    ${data}`;
  }
}
