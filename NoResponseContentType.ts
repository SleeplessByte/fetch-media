import { FetchMediaError } from './FetchMediaError';

/**
 * When using fetch-media, the response is automatically parsed based on its
 * Content-Type. If the response has no Content-Type, then the response can not
 * be parsed.
 *
 * Catch this error and use the response property to manually handle such
 * responses.
 */
export class NoResponseContentType extends FetchMediaError {
  constructor(
    public readonly url: string,
    response: Response
  ) {
    super(
      `
      A request to ${url} yielded a response (${response.status}: ${response.statusText}) without a Content-Type.
    `,
      response
    );

    Object.setPrototypeOf(this, NoResponseContentType.prototype);
  }
}
