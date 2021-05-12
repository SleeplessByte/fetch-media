import { FetchMediaError } from './FetcMediaError';

export class JsonError extends FetchMediaError {
  constructor(response: Response, public readonly data: any) {
    super(JsonError.getError(data), response);

    Object.setPrototypeOf(this, JsonError.prototype);
  }

  private static getError(data: any): string {
    // Common error keys
    const result =
      data['message'] ||
      data['error'] ||
      data['details'] ||
      data['title'] ||
      data['errors'];
    if (!result) {
      return `Tried to extract error from JSON, looking for 'message', 'error', 'details', 'title' and 'errors, buy found ${Object.keys(
        data
      )}.`;
    }

    if (Array.isArray(result)) {
      return result.join(', ');
    }

    return result;
  }
}
