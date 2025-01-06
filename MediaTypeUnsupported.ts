import { FetchMediaError } from './FetchMediaError';

/**
 * When using fetch-media, the response can include a body that automatically is
 * converted from the correct format. In order for this to work, the response
 * MUST always include a Content-Type in the response, when a body is present.
 * Here are the common types supported:
 *
 * - text/*                                           : .text()
 * - application/json application/vnd.<vendor>*+json  : .json()
 * - image/* video/* audio/* application/octet-stream : .arrayBuffer() / .blob()
 * - multipart/form-data                              : .formData()
 * - application/x-www-form-urlencoded                : new URLSearchParams()
 *
 * Note that this is the list of types for content types when RECEIVING data.
 * When sending data, it follows the limitations of fetch, but also converts
 * structured data to a JSON string.
 */
export class MediaTypeUnsupported extends FetchMediaError {
  constructor(
    public readonly url: string,
    response: Response | { status: number; statusText: string; url: string },
    public readonly accept: string,
    public readonly contentType: string
  ) {
    super(
      `
      A request to ${url} yielded a response (${response.status}: ${response.statusText})
      with a Content-Type that is unsupported. The original request expected:

      ${accept}

      The final response reports as ${contentType || '<none>'}.
    `,
      response
    );

    Object.setPrototypeOf(this, MediaTypeUnsupported.prototype);
  }
}
