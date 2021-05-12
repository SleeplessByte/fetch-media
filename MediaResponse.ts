import URLSearchParams from '@ungap/url-search-params';

import { FetchMediaError } from './FetcMediaError';

export class MediaResponse<
  T extends
    | unknown
    | object
    | string
    | ArrayBuffer
    | Blob
    | FormData
    | URLSearchParams
    | FetchMediaError
> {
  public static text(response: Response): Promise<MediaResponse<string>> {
    return response
      .text()
      .then((result) => new MediaResponse(result, response));
  }

  public static json(response: Response): Promise<MediaResponse<unknown>> {
    return response
      .json()
      .then((result) => new MediaResponse(result as unknown, response));
  }

  public static urlSearchParams(
    response: Response
  ): Promise<MediaResponse<URLSearchParams>> {
    return response
      .text()
      .then(
        (result) => new MediaResponse(new URLSearchParams(result), response)
      );
  }

  public static arrayBuffer(
    response: Response
  ): Promise<MediaResponse<ArrayBuffer>> {
    return response
      .arrayBuffer()
      .then((result) => new MediaResponse(result, response));
  }

  public static blob(response: Response): Promise<MediaResponse<Blob>> {
    return response
      .blob()
      .then((result) => new MediaResponse(result, response));
  }

  public static formData(response: Response): Promise<MediaResponse<FormData>> {
    return response
      .formData()
      .then((result) => new MediaResponse(result, response));
  }

  public static error(
    error: FetchMediaError,
    response: Response
  ): MediaResponse<FetchMediaError> {
    return new MediaResponse(error, response);
  }

  private constructor(
    public readonly result: T,
    public readonly response: Response
  ) {}

  public ok(): boolean {
    return !(this.result instanceof Error);
  }

  public unwrap(): T {
    if (this.result instanceof Error) {
      throw this.result;
    }

    return this.result;
  }
}
