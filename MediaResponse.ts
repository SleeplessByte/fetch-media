import URLSearchParams from '@ungap/url-search-params';

import { FetchMediaError } from './FetchMediaError';

export type CompatibleResponse = Omit<Response, 'bytes' | 'clone'> & { bytes?: Response['bytes'] };

export class MediaResponse<
  T extends
    | unknown
    | object
    | string
    | ArrayBuffer
    | Blob
    | FormData
    | URLSearchParams
    | FetchMediaError,
> {
  public static async text(response: CompatibleResponse): Promise<MediaResponse<string>> {
    const result = await response.text();
    return new MediaResponse(result, response);
  }

  public static async json(response: CompatibleResponse): Promise<MediaResponse<unknown>> {
    const result = await response.json();
    return new MediaResponse(result as unknown, response);
  }

  public static async urlSearchParams(
    response: CompatibleResponse
  ): Promise<MediaResponse<URLSearchParams>> {
    const result = await response.text();
    return new MediaResponse(new URLSearchParams(result), response);
  }

  public static async arrayBuffer(
    response: CompatibleResponse
  ): Promise<MediaResponse<ArrayBuffer>> {
    const result = await response.arrayBuffer();
    return new MediaResponse(result, response);
  }

  public static async blob(response: CompatibleResponse): Promise<MediaResponse<Blob>> {
    const result = await response.blob();
    return new MediaResponse(result, response);
  }

  public static async formData(response: CompatibleResponse): Promise<MediaResponse<FormData>> {
    const result = await response.formData();
    return new MediaResponse(result, response);
  }

  public static error(
    error: FetchMediaError,
    response: CompatibleResponse | { status: number; statusText: string; headers: Headers }
  ): MediaResponse<FetchMediaError> {
    return new MediaResponse(error, response);
  }

  private constructor(
    public readonly result: T,
    public readonly response:
      | CompatibleResponse
      | { status: number; statusText: string; headers: Headers }
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
