const MEDIA_PROBLEM = 'application/problem+json';
const MEDIA_JSON_SUFFIX = '+json';
const MEDIA_JSON = 'application/json';
const MEDIA_GENERIC_BIN = 'application/octet-stream';
const MEDIA_TEXT_GROUP = 'text/';
const MEDIA_IMAGE_GROUP = 'image/';
const MEDIA_AUDIO_GROUP = 'audio/';
const MEDIA_VIDEO_GROUP = 'video/';
const MEDIA_FORM_DATA = 'multipart/form-data';
const MEDIA_FORM_URL_ENCODED = 'application/x-www-form-urlencoded';
const CUSTOM_ERROR = /application\/vnd\.(.+?)\.errors(?:\.v1[0-9]*)\+json/;

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
    const mapped = header.replace(/[A-Z]/g, (m) => '-' + m.toLocaleLowerCase());
    const value = headers[header as keyof KnownHeaders];
    if (value) {
      result[mapped] = value;
    }
    return result;
  }, {} as Record<string, string>);
}

type MediaHeaders = Partial<KnownHeaders> & Pick<KnownHeaders, 'accept'>;
type MediaMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
type MediaOptions = {
  /**
   * The headers passed into fetch
   */
  headers: MediaHeaders;

  /**
   * The HTTP method
   */
  method?: MediaMethod;

  /**
   * The HTTP body
   */
  body?: any;

  /**
   * Abort signal (for the fetch promise)
   */
  signal?: AbortSignal;

  /**
   * If set, prints debugging information about the request
   */
  debug?: boolean;

  /**
   * If true, raises when JSON is returned
   */
  disableJson?: boolean;

  /**
   * If true, raises when text is returned
   */
  disableText?: boolean;

  /**
   * If true, raises when multipart/form-data is returned
   */
  disableFormData?: boolean;

  /**
   * If true, raises when url encoded form data is returned
   */
  disableFormUrlEncoded?: boolean;

  /**
   * If false, raises when binary is returned
   */
  handleBinary?: false | 'array-buffer' | 'blob';
};

/**
 * Fetches media from a URL
 *
 * - Automatically encodes the request body if the contentType is a JSON type
 * - Automatically decodes the response body
 *    - as parsed JSON if it's JSON
 *    - as string if it's text
 *    - as ArrayBuffer or Blob if it's binary
 *    - as FormData if it's multipart/form-data
 *    - as UrlSearchParams if it has a body of url encoded form data
 * - Automatically parses errors, problems, structured errors, etc.
 *
 * @see MediaOptions
 *
 * @param url the fully qualified url to fetch from
 * @param param1 the {MediaOptions}
 * @returns A fetch promise
 */
export async function fetchMedia(
  url: string,
  {
    headers: { accept, ...otherHeaders },
    method = 'GET',
    body,
    signal,
    debug,

    disableJson,
    disableText,
    disableFormData,
    disableFormUrlEncoded,
    handleBinary,
  }: MediaOptions
): Promise<object | string | ArrayBuffer | Blob | FormData | URLSearchParams> {
  const headers: Record<string, string> = {
    ...HeadersRef.current,
    accept: [accept, AcceptRef.current].join(', '),
    ...remapHeaders(otherHeaders),
  };

  const contentType = headers['content-type'];
  const encodedBody = encodeBody(body, contentType);

  if (debug) {
    console.debug(`${method} ${url}`);
    console.debug('> accept', accept);
    console.debug('> body of', contentType);
    console.debug('> headers', headers);
    encodedBody && console.debug('> body', encodedBody);
  }

  if (body && !contentType) {
    throw new NoRequestContentType(
      url,
      new Response(undefined, { status: -1 })
    );
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
    const responseContentType = response.headers.get('content-type');
    if (!responseContentType) {
      throw new NoResponseContentType(url, response);
    }

    // The response is json
    if (
      (!disableJson && responseContentType.includes(MEDIA_JSON_SUFFIX)) ||
      responseContentType.startsWith(MEDIA_JSON)
    ) {
      return response.json();
    }

    // The response is text
    if (!disableText && responseContentType.startsWith(MEDIA_TEXT_GROUP)) {
      return response.text();
    }

    // The response is binary
    if (
      handleBinary &&
      (responseContentType.startsWith(MEDIA_IMAGE_GROUP) ||
        responseContentType.startsWith(MEDIA_AUDIO_GROUP) ||
        responseContentType.startsWith(MEDIA_VIDEO_GROUP) ||
        responseContentType.startsWith(MEDIA_GENERIC_BIN))
    ) {
      return handleBinary === 'array-buffer'
        ? response.arrayBuffer()
        : response.blob();
    }

    // The response is form data
    if (!disableFormData && responseContentType.startsWith(MEDIA_FORM_DATA)) {
      return response.formData();
    }

    // The response is url encoded form data (in the body)
    if (
      !disableFormUrlEncoded &&
      responseContentType.startsWith(MEDIA_FORM_URL_ENCODED)
    ) {
      return response.text().then((result) => new URLSearchParams(result));
    }

    // The response has unsupported data
    throw new MediaTypeUnsupported(url, response, accept, responseContentType);
  } catch (responseOrError) {
    if (responseOrError instanceof Error) {
      return Promise.reject(responseOrError);
    }

    if (responseOrError instanceof Response) {
      const errorContentType = responseOrError.headers.get('content-type')!;

      // It's a problem
      if (errorContentType.startsWith(MEDIA_PROBLEM)) {
        return responseOrError.json().then((response_1) => {
          return Promise.reject(new Problem(responseOrError, response_1));
        });
      }

      // It's a structured error
      if (CUSTOM_ERROR.test(errorContentType)) {
        return responseOrError.json().then((response_2) => {
          return Promise.reject(
            new StructuredErrors(responseOrError, response_2)
          );
        });
      }

      // It's a generic json error
      if (errorContentType.startsWith(MEDIA_JSON)) {
        return responseOrError.json().then((response_3) => {
          return Promise.reject(new JsonError(responseOrError, response_3));
        });
      }

      if (errorContentType.startsWith(MEDIA_TEXT_GROUP)) {
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
          errorContentType
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

export class FetchMediaError extends Error {
  constructor(message: string, public readonly response: Response) {
    super(message);

    Object.setPrototypeOf(this, FetchMediaError.prototype);
  }
}

/**
 * When using fetch-media, the response is automatically parsed based on its
 * Content-Type. If the response has no Content-Type, then the response can not
 * be parsed.
 *
 * Catch this error and use the response property to manually handle such
 * responses.
 */
export class NoResponseContentType extends FetchMediaError {
  constructor(public readonly url: string, response: Response) {
    super(
      `
      A request to ${url} yielded a response (${response.status}: ${response.statusText}) without a Content-Type.
    `,
      response
    );

    Object.setPrototypeOf(this, NoResponseContentType.prototype);
  }
}

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

    Object.setPrototypeOf(this, NoResponseContentType.prototype);
  }
}

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
    response: Response,
    public readonly accept: string,
    public readonly contentType: string
  ) {
    super(
      `
      A request to ${url} yielded a response (${response.status}: ${response.statusText})
      with a Content-Type that is unsupported. The original request expected:

      ${accept}

      The final response reports as ${contentType}.
    `,
      response
    );

    Object.setPrototypeOf(this, MediaTypeUnsupported.prototype);
  }
}

export class JsonError extends FetchMediaError {
  constructor(response: Response, public readonly data: any) {
    super(JsonError.getError(data), response);

    Object.setPrototypeOf(this, JsonError.prototype);
  }

  private static getError(data: any): string {
    return data['message'];
  }
}

export class StructuredErrors extends FetchMediaError {
  constructor(response: Response, public readonly data: any) {
    super(StructuredErrors.getError(data), response);

    Object.setPrototypeOf(this, StructuredErrors.prototype);
  }

  private static getError(data: any): string {
    return data['errors']
      .map(({ message }: { message: string }) => message)
      .join(', ');
  }
}

export class Problem extends FetchMediaError {
  constructor(response: Response, public readonly data: any) {
    super(Problem.getError(data), response);

    Object.setPrototypeOf(this, Problem.prototype);
  }

  private static getError(data: any): string {
    return data.detail;
  }
}

export class TextError extends FetchMediaError {
  constructor(response: Response, public readonly data: string) {
    super(TextError.getError(response, data), response);

    Object.setPrototypeOf(this, TextError.prototype);
  }

  private static getError(response: Response, data: string): string {
    return `[${response.status}] ${response.url}
    Expected a structured error or problem, but got text:
    ${data}`;
  }
}
