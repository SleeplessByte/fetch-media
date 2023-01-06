import { FetchMediaError } from './FetcMediaError';

export class StructuredErrors extends FetchMediaError {
  constructor(
    response: Response | { status: number; statusText: string; url: string },
    public readonly data: any
  ) {
    super(StructuredErrors.getError(data), response);

    Object.setPrototypeOf(this, StructuredErrors.prototype);
  }

  private static getError(data: any): string {
    return data['errors']
      .map(({ message }: { message: string }) => message)
      .join(', ');
  }
}
