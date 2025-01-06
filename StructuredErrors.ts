import { FetchMediaError } from './FetchMediaError';
import type { CompatibleResponse } from './MediaResponse';

export class StructuredErrors extends FetchMediaError {
  constructor(
    response: CompatibleResponse | { status: number; statusText: string; url: string },
    public readonly data: any
  ) {
    super(StructuredErrors.getError(data), response);

    Object.setPrototypeOf(this, StructuredErrors.prototype);
  }

  private static getError(data: any): string {
    return data['errors'].map(({ message }: { message: string }) => message).join(', ');
  }
}
