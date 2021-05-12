import { FetchMediaError } from './FetcMediaError';

export class Problem extends FetchMediaError {
  constructor(response: Response, public readonly data: any) {
    super(Problem.getError(data), response);

    Object.setPrototypeOf(this, Problem.prototype);
  }

  private static getError(data: any): string {
    return data.detail;
  }
}
