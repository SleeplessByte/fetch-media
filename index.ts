const MEDIA_PROBLEM = 'application/problem+json';
const MEDIA_JSON_SUFFIX = '+json';
const MEDIA_JSON = 'application/json';
const MEDIA_GENERIC_BIN = 'application/octet-stream';
const MEDIA_TEXT_GROUP = 'text/';
const MEDIA_IMAGE_GROUP = 'image/';
const MEDIA_AUDIO_GROUP = 'audio/';
const MEDIA_VIDEO_GROUP = 'video/';
const CUSTOM_ERROR = /application\/vnd\.(.+?)\.errors(?:\.v1[0-9]+)\+json/;

export const ACCEPT_PROBLEM = MEDIA_PROBLEM + '; q=0.1';

const AcceptRef: { current: readonly string[] } = { current: [ACCEPT_PROBLEM] };
const HeadersRef: { current: Readonly<Record<string, string>> } = {
  current: {},
};

export function setDefaultAccept(...accept: readonly string[]) {
  AcceptRef.current = accept.slice();
}

export function setDefaultHeaders(headers: Record<string, string>) {
  HeadersRef.current = headers || {};
}

interface KnownHeaders {
  accept: string;
  authorization: string;
  contentType: string;
  cacheControl: string;
}

function remapHeaders(headers: Partial<KnownHeaders>): Record<string, string> {
  return Object.keys(headers).reduce((result, header) => {
    const mapped = header.split(/[A-Z]/g).join('-').toLocaleLowerCase();
    const value = headers[header as keyof KnownHeaders];
    if (value) {
      result[mapped] = value;
    }
    return result;
  }, {} as Record<string, string>);
}

type MediaHeaders = Partial<KnownHeaders> & Pick<KnownHeaders, 'accept'>;
type MediaMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type MediaOptions = {
  headers: MediaHeaders;
  method?: MediaMethod;
  body?: any;
  signal?: AbortSignal;
  debug?: boolean;
};

/**
 * Fetches media from a URL
 *
 * - Automatically encodes the request body if the contentType is a JSON type
 * - Automatically decodes the response body
 *    - as parsed JSON if it's JSON
 *    - as string if it's text
 *    - as ArrayBuffer if it's binary
 * - Automatically parses errors
 */
export async function fetchMedia(
  url: string,
  {
    headers: { accept, ...otherHeaders },
    method = 'GET',
    body,
    signal,
    debug,
  }: MediaOptions
): Promise<object | string> {
  const headers: Record<string, string> = {
    ...HeadersRef.current,
    accept: [accept, AcceptRef].join(', '),
    ...remapHeaders(otherHeaders),
  };

  const contentType = headers['content-type'];
  const encodedBody = encodeBody(body, contentType);

  if (debug) {
    console.debug(`${method} ${url}`);
    console.debug('> accept', accept);
    console.debug('> body of', contentType);
    console.debug('> headers', headers);
    console.debug('> body', encodedBody);
  }

  try {
    const response = await fetch(url, {
      headers,
      method,
      body: encodeBody(body, contentType, debug),
      signal,
    });
    // Forward response to error
    if (!response.ok || response.status >= 400) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw response;
    }

    // Test for response content
    const contentType_1 = response.headers.get('content-type');
    if (!contentType_1) {
      throw new NoResponseContentType(url, response);
    }

    // The response is json
    if (
      contentType_1.includes(MEDIA_JSON_SUFFIX) ||
      contentType_1.startsWith(MEDIA_JSON)
    ) {
      return response.json();
    }

    // The response is text
    if (contentType_1.startsWith(MEDIA_TEXT_GROUP)) {
      return response.text();
    }

    // The response is binary
    if (
      contentType_1.startsWith(MEDIA_IMAGE_GROUP) ||
      contentType_1.startsWith(MEDIA_AUDIO_GROUP) ||
      contentType_1.startsWith(MEDIA_VIDEO_GROUP) ||
      contentType_1.startsWith(MEDIA_GENERIC_BIN)
    ) {
      return response.arrayBuffer();
    }

    throw new MediaTypeUnsupported(url, response, accept, contentType_1);
  } catch (responseOrError) {
    if (responseOrError instanceof Error) {
      return Promise.reject(responseOrError);
    }

    if (responseOrError instanceof Response) {
      const contentType_2 = responseOrError.headers.get('content-type')!;

      // It's a problem
      if (contentType_2.startsWith(MEDIA_PROBLEM)) {
        return responseOrError.json().then((response_1) => {
          return Promise.reject(new Problem(responseOrError, response_1));
        });
      }

      // It's a structured error
      if (CUSTOM_ERROR.test(contentType_2)) {
        return responseOrError.json().then((response_2) => {
          return Promise.reject(
            new StructuredErrors(responseOrError, response_2)
          );
        });
      }

      // It's a generic json error
      if (contentType_2.startsWith(MEDIA_JSON)) {
        return responseOrError.json().then((response_3) => {
          return Promise.reject(new JsonError(responseOrError, response_3));
        });
      }

      if (contentType_2.startsWith(MEDIA_TEXT_GROUP)) {
        return responseOrError.text().then((response_4) => {
          return Promise.reject(new TextError(responseOrError, response_4));
        });
      }

      // It's an error-response but not machine readable
      return Promise.reject(
        new MediaTypeUnsupported(
          url,
          responseOrError,
          [
            'application/vnd.<vendor>.errors[.v<version>]+json',
            ACCEPT_PROBLEM,
          ].join(', '),
          contentType_2
        )
      );
    }
    return Promise.reject(
      new Error(
        `Unknown issue occurred. Not an Error or Response, but ${responseOrError}`
      )
    );
  }
}

function encodeBody(
  data: any,
  contentType: string | undefined,
  debug?: boolean
) {
  if (contentType === undefined) {
    return data;
  }

  if (
    contentType.includes(MEDIA_JSON_SUFFIX) ||
    contentType.startsWith(MEDIA_JSON)
  ) {
    return JSON.stringify(data, undefined, debug ? 2 : undefined);
  }

  return data;
}

export class NoResponseContentType extends Error {
  constructor(public readonly url: string, public readonly response: Response) {
    super(`
      A request to ${url} yielded a response (${response.status}: ${response.statusText}) without a Content-Type.
    `);
  }
}

export class MediaTypeUnsupported extends Error {
  constructor(
    public readonly url: string,
    public readonly response: Response,
    public readonly accept: string,
    public readonly contentType: string
  ) {
    super(`
      A request to ${url} yielded a response (${response.status}: ${response.statusText})
      with a Content-Type that is unsupported. The original request expected:

      ${accept}

      The final response reports as ${contentType}.
    `);
  }
}

export class JsonError extends Error {
  constructor(public readonly response: Response, data: any) {
    super(JsonError.getError(data));
  }

  private static getError(data: any): string {
    return data['message'];
  }
}

export class StructuredErrors extends Error {
  constructor(public readonly response: Response, data: any) {
    super(StructuredErrors.getError(data));
  }

  private static getError(data: any): string {
    return data['errors']
      .map(({ message }: { message: string }) => message)
      .join(', ');
  }
}

export class Problem extends Error {
  constructor(public readonly response: Response, data: any) {
    super(Problem.getError(data));
  }

  private static getError(data: any): string {
    return data.detail;
  }
}

export class TextError extends Error {
  constructor(public readonly response: Response, data: string) {
    super(TextError.getError(response, data));
  }

  private static getError(response: Response, data: string): string {
    return `[${response.status}] ${response.url}
    Expected a structured error or problem, but got text:
    ${data}`;
  }
}
