import { JsonError } from './JsonError';
import { MediaResponse } from './MediaResponse';
import { MediaTypeUnsupported } from './MediaTypeUnsupported';
import { NoRequestContentType } from './NoRequestContentType';
import { NoResponseContentType } from './NoResponseContentType';
import { Problem } from './Problem';
import { StructuredErrors } from './StructuredErrors';
import { TextError } from './TextError';

export {
  JsonError,
  MediaTypeUnsupported,
  NoRequestContentType,
  NoResponseContentType,
  Problem,
  StructuredErrors,
  TextError,
};

export { FetchMediaError } from './FetchMediaError';

export const MEDIA_PROBLEM = 'application/problem+json';
export const MEDIA_JSON_SUFFIX = '+json';
export const MEDIA_JSON = 'application/json';
export const MEDIA_GENERIC_BIN = 'application/octet-stream';
export const MEDIA_TEXT_GROUP = 'text/';
export const MEDIA_IMAGE_GROUP = 'image/';
export const MEDIA_AUDIO_GROUP = 'audio/';
export const MEDIA_VIDEO_GROUP = 'video/';
export const MEDIA_FORM_DATA = 'multipart/form-data';
export const MEDIA_FORM_URL_ENCODED = 'application/x-www-form-urlencoded';
export const CUSTOM_ERROR = /application\/vnd\.(.+?)\.errors(?:\.v[1-9][0-9]*)\+json/;
export const CUSTOM_PROBLEM = /application\/vnd\.(.+?)\.problem(?:\.v[1-9][0-9]*)?\+json/;

export const ACCEPT_PROBLEM = MEDIA_PROBLEM + '; q=0.1';

// Convert to Winter-CG compliant fetch
type CompatibleRequestInit = Omit<
  RequestInit,
  'body' | 'cache' | 'signal' | 'priority' | 'redirect' | 'referrerPolicy' | 'window'
> & { body?: BodyInit; signal?: AbortSignal; window?: any };

type CompatibleFetch = (
  url: string,

  // Only keeping the ones used here
  init?: Pick<CompatibleRequestInit, 'headers' | 'body' | 'method' | 'signal'>
) => Promise<Response>;

const actualThis = typeof globalThis === 'undefined' ? window : globalThis;
// const Request = actualThis.Request
const Response = actualThis.Response;
const globalFetch: CompatibleFetch = actualThis.fetch;

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
  acceptLanguage: string;
  authorization: string;
  contentType: string;
  cacheControl: string;
  etag: string;
  ifMatch: string;
  ifNoneMatch: string;
  ifModifiedSince: string;
  ifUnmodifiedSince: string;
  userAgent: string;
}

function remapHeaders(headers: Partial<KnownHeaders>): Record<string, string> {
  return Object.keys(headers).reduce(
    (result, header) => {
      // contentType -> content-type
      // content-type -> content-type
      // Content-Type -> Content-Type
      // accept -> accept
      // Accept -> Accept
      const mapped =
        isUpperCase(header[0]) || header.includes('-')
          ? header
          : header.replace(/[A-Z]/g, (m) => '-' + m.toLocaleLowerCase());
      const value = headers[header as keyof KnownHeaders];
      if (value) {
        result[mapped] = value;
      }
      return result;
    },
    {} as Record<string, string>
  );
}

function isUpperCase(value: string): boolean {
  const letter = value[0];
  return letter.toLocaleUpperCase() === letter;
}

type MediaHeaders = Partial<KnownHeaders> &
  Pick<KnownHeaders, 'accept'> &
  Partial<Record<Exclude<string, keyof KnownHeaders>, string>>;
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

  hooks?: {
    before?: (request: MediaRequestBag) => void;
    after?: (response: MediaResponseBag) => void;
  };

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

  /**
   * If given, uses this to fetch instead of the global fetch
   */
  fetch?: typeof globalFetch;
};

type MediaRequestBag = Pick<MediaOptions, 'method'> &
  Pick<MediaHeaders, 'accept' | 'contentType'> & {
    url: string;
    encodedBody: ReturnType<typeof encodeBody>;
    headers: Record<string, string>;
  };
type MediaResponseBag = Pick<Response, 'status' | 'url' | 'headers'> &
  Pick<MediaHeaders, 'contentType'>;

const debug =
  typeof console === 'object'
    ? 'debug' in console
      ? console.debug.bind(console)
      : (console as Console).log.bind(console)
    : process.stdout.write.bind(process.stdout);

const DEBUG_BEFORE = ({
  method,
  url,
  accept,
  contentType,
  headers,
  encodedBody,
}: MediaRequestBag): void => {
  debug(`${method} ${url}`);
  debug('> accept', accept);
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  (contentType || encodedBody) && debug('> body of', contentType);
  debug('> headers', headers);
  encodedBody && debug('> body', encodedBody);
};

const DEBUG_AFTER = ({ status, url, contentType, headers }: MediaResponseBag): void => {
  debug(`< [${status}] ${url}`);
  contentType && debug('< body of', contentType);

  const logHeaders: Record<string, string> = {};

  headers.forEach(
    (val, key) => (logHeaders[key] = logHeaders[key] ? `${logHeaders[key]}, ${val}` : val)
  );

  debug('< headers', logHeaders);
};

export async function fetchMedia(
  url: string,
  options: Omit<
    MediaOptions,
    'disableJson' | 'disableText' | 'disableFormData' | 'disableFormUrlEncoded' | 'handleBinary'
  > & {
    disableJson: true;
    disableText?: false;
    disableFormData: true;
    disableFormUrlEncoded: true;
    handleBinary?: false;
  }
): Promise<string>;

export async function fetchMedia(
  url: string,
  options: Omit<
    MediaOptions,
    'disableJson' | 'disableText' | 'disableFormData' | 'disableFormUrlEncoded' | 'handleBinary'
  > & {
    disableJson?: false;
    disableText: true;
    disableFormData: true;
    disableFormUrlEncoded: true;
    handleBinary?: false;
  }
): Promise<object>;

export async function fetchMedia(
  url: string,
  options: Omit<
    MediaOptions,
    'disableJson' | 'disableText' | 'disableFormData' | 'disableFormUrlEncoded' | 'handleBinary'
  > & {
    disableJson?: false;
    disableText?: false;
    disableFormData: true;
    disableFormUrlEncoded: true;
    handleBinary?: false;
  }
): Promise<object | string>;

export async function fetchMedia(
  url: string,
  options: MediaOptions
): Promise<unknown | string | ArrayBuffer | Blob | FormData | URLSearchParams>;

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
  options: MediaOptions
): Promise<unknown | string | ArrayBuffer | Blob | FormData | URLSearchParams> {
  const result = await fetchMediaWrapped(url, options);
  return result.unwrap();
}

export async function fetchMediaWrapped(
  url: string,
  options: Omit<
    MediaOptions,
    'disableJson' | 'disableText' | 'disableFormData' | 'disableFormUrlEncoded' | 'handleBinary'
  > & {
    disableJson: true;
    disableText?: false;
    disableFormData: true;
    disableFormUrlEncoded: true;
    handleBinary?: false;
  }
): Promise<MediaResponse<string>>;

export async function fetchMediaWrapped(
  url: string,
  options: Omit<
    MediaOptions,
    'disableJson' | 'disableText' | 'disableFormData' | 'disableFormUrlEncoded' | 'handleBinary'
  > & {
    disableJson?: false;
    disableText: true;
    disableFormData: true;
    disableFormUrlEncoded: true;
    handleBinary?: false;
  }
): Promise<MediaResponse<unknown>>;

export async function fetchMediaWrapped(
  url: string,
  options: Omit<
    MediaOptions,
    'disableJson' | 'disableText' | 'disableFormData' | 'disableFormUrlEncoded' | 'handleBinary'
  > & {
    disableJson?: false;
    disableText?: false;
    disableFormData: true;
    disableFormUrlEncoded: true;
    handleBinary?: false;
  }
): Promise<MediaResponse<unknown | string>>;

export async function fetchMediaWrapped(
  url: string,
  options: MediaOptions
): Promise<MediaResponse<unknown | string | ArrayBuffer | Blob | FormData | URLSearchParams>>;

export async function fetchMediaWrapped(
  url: string,
  {
    headers: { accept, ...otherHeaders },
    method = 'GET',
    body,
    signal,
    debug,

    hooks: {
      before = debug ? DEBUG_BEFORE : undefined,
      after = debug ? DEBUG_AFTER : undefined,
    } = {
      before: debug ? DEBUG_BEFORE : undefined,
      after: debug ? DEBUG_AFTER : undefined,
    },

    disableJson,
    disableText,
    disableFormData,
    disableFormUrlEncoded,
    handleBinary,

    fetch: localFetch = globalFetch,
  }: MediaOptions
): Promise<MediaResponse<unknown | string | ArrayBuffer | Blob | FormData | URLSearchParams>> {
  const headers: Record<string, string> = {
    ...HeadersRef.current,
    accept: [accept, AcceptRef.current].join(', '),
    ...remapHeaders(otherHeaders),
  };

  const contentType = headers['content-type'];
  const encodedBody = encodeBody(body, contentType);

  before?.({ method, url, accept, contentType, headers, encodedBody });

  if (body && !contentType && !(body instanceof FormData)) {
    const response = new Response(undefined, { status: 400 });
    return MediaResponse.error(new NoRequestContentType(url, response), response);
  }

  try {
    const response = await localFetch(url, {
      headers,
      method,
      body: encodeBody(body, contentType, debug),
      signal,
    });

    // Forward response to error
    if (!response.ok || response.status >= 400) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw response;
    }

    // Test for response content
    const responseContentType = response.headers.get('content-type');
    if (!responseContentType) {
      return MediaResponse.error(new NoResponseContentType(url, response), response);
    }

    after?.({
      url: response.url,
      status: response.status,
      headers: response.headers,
      contentType: responseContentType,
    });

    // The response is json
    if (
      (!disableJson && responseContentType.includes(MEDIA_JSON_SUFFIX)) ||
      responseContentType.startsWith(MEDIA_JSON)
    ) {
      return await MediaResponse.json(response);
    }

    // The response is text
    if (!disableText && responseContentType.startsWith(MEDIA_TEXT_GROUP)) {
      return await MediaResponse.text(response);
    }

    // The response is binary
    if (
      handleBinary &&
      (responseContentType.startsWith(MEDIA_IMAGE_GROUP) ||
        responseContentType.startsWith(MEDIA_AUDIO_GROUP) ||
        responseContentType.startsWith(MEDIA_VIDEO_GROUP) ||
        responseContentType.startsWith(MEDIA_GENERIC_BIN))
    ) {
      return await (handleBinary === 'array-buffer'
        ? MediaResponse.arrayBuffer(response)
        : MediaResponse.blob(response));
    }

    // The response is form data
    if (!disableFormData && responseContentType.startsWith(MEDIA_FORM_DATA)) {
      return await MediaResponse.formData(response);
    }

    // The response is url encoded form data (in the body)
    if (!disableFormUrlEncoded && responseContentType.startsWith(MEDIA_FORM_URL_ENCODED)) {
      return await MediaResponse.urlSearchParams(response);
    }

    // The response has unsupported data
    throw new MediaTypeUnsupported(url, response, accept, responseContentType);
  } catch (responseOrError) {
    if (responseOrError instanceof Error) {
      return await Promise.reject(responseOrError);
    }

    if (isResponseLike(responseOrError)) {
      const errorContentType = responseOrError.headers.get('content-type')!;
      const safeResponse =
        responseOrError instanceof Response
          ? responseOrError
          : {
              status: (responseOrError as Response).status,
              statusText: (responseOrError as Response).statusText,
              url: (responseOrError as Response).url,
              headers: (responseOrError as Response).headers,
            };

      after?.({
        url: responseOrError.url,
        status: responseOrError.status,
        headers: responseOrError.headers,
        contentType: errorContentType,
      });

      // Can't read it. Bail early
      if (!errorContentType) {
        return MediaResponse.error(
          new MediaTypeUnsupported(
            url,
            safeResponse,
            ['application/vnd.<vendor>.errors[.v<version>]+json', ACCEPT_PROBLEM].join(', '),
            errorContentType
          ),
          safeResponse
        );
      } else if (
        errorContentType.startsWith(MEDIA_PROBLEM) ||
        CUSTOM_PROBLEM.test(errorContentType)
      ) {
        // It's a problem
        const responseWithProblem = await responseOrError.json();

        return MediaResponse.error(new Problem(safeResponse, responseWithProblem), safeResponse);
      } else if (CUSTOM_ERROR.test(errorContentType)) {
        // It's a structured error
        const responseWithError = await responseOrError.json();

        return MediaResponse.error(
          new StructuredErrors(safeResponse, responseWithError),
          safeResponse
        );
      } else if (errorContentType.startsWith(MEDIA_JSON)) {
        // It's a generic json error
        const responseWithJson = await responseOrError.json();
        // Test if it can be coerced into a structured error
        if (
          typeof responseWithJson === 'object' &&
          responseWithJson !== null &&
          responseWithJson.hasOwnProperty('errors') &&
          Array.isArray(responseWithJson['errors']) &&
          (responseWithJson['errors'].length === 0 ||
            (typeof responseWithJson['errors'][0] === 'object' &&
              responseWithJson['errors'][0] !== null &&
              responseWithJson['errors'][0].hasOwnProperty('message')))
        ) {
          return MediaResponse.error(
            new StructuredErrors(safeResponse, responseWithJson),
            safeResponse
          );
        }

        return MediaResponse.error(new JsonError(safeResponse, responseWithJson), safeResponse);
      } else if (errorContentType.startsWith(MEDIA_TEXT_GROUP)) {
        // It's a generic text error
        const responseWithText = await responseOrError.text();

        return MediaResponse.error(new TextError(safeResponse, responseWithText), safeResponse);
      } else {
        // It's an error-response but not machine readable
        return MediaResponse.error(
          new MediaTypeUnsupported(
            url,
            safeResponse,
            [
              'application/vnd.<vendor>.errors[.v<version>]+json',
              'application/vnd.<vendor>.problem+json',
              ACCEPT_PROBLEM,
            ].join(', '),
            errorContentType
          ),
          safeResponse
        );
      }
    }

    return await Promise.reject(
      new Error(`Unknown issue occurred. Not an Error or Response, but ${responseOrError}`)
    );
  }
}

function encodeBody(data: any, contentType: string | undefined, debug?: boolean) {
  if (contentType === undefined) {
    return data;
  }

  if (contentType.includes(MEDIA_JSON_SUFFIX) || contentType.startsWith(MEDIA_JSON)) {
    return JSON.stringify(data, undefined, debug ? 2 : undefined);
  }

  return data;
}

function isResponseLike(response: unknown): response is Response {
  if (!response || typeof response !== 'object') {
    return false;
  }

  return (
    typeof (response as any).headers === 'object' &&
    typeof (response as any).status === 'number' &&
    typeof (response as any).statusText === 'string' &&
    typeof (response as any).json === 'function'
  );
}
