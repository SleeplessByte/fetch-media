import { FetchMediaError } from './FetcMediaError';

/**
 * When using fetch-media, the request can include a body that automatically is
 * converted to the correct format. In order for this to work, you MUST always
 * include a Content-Type in the request, when passing in a body. Here are the
 * common types supported:
 *
 * - String           : text/*
 * - StructuredData   : application/json application/vnd.<vendor>*+json
 * - Blob             : image/* video/* audio/* application/*
 * - BufferSource     : image/* video/* audio/* application/*
 * - FormData         : multipart/form-data
 * - URLSearchParams  : application/x-www-form-urlencoded
 * - ReadableStream<Uint8Array> : image/* video/* audio/* application/*
 *
 * Note that this is the list of types for content types when SENDING data. When
 * receiving data, currently it only automatically handles text, FormData, JSON,
 * URL Encoded data and binary, where all binary types are converted to
 * ArrayBuffer or Blob.
 */
export class NoRequestContentType extends FetchMediaError {
  constructor(public readonly url: string, response: Response) {
    super(
      `
      A request to ${url} wanted to include a body, but a Content-Type has not been given. Add a Content-Type.
    `,
      response
    );

    Object.setPrototypeOf(this, NoRequestContentType.prototype);
  }
}
