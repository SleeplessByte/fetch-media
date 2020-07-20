# fetch-media

Utility function that uses fetch to fetch a media-enabled resource

## Installation

```bash
yarn add fetch-media
```

## Usage

```typescript
import { fetchMedia } from 'fetch-media';

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

fetchMedia('https://example.org', {
  headers: { accept: 'text/html' },
  method: 'GET',
}).then((result) => {
  /* html body as string */
});
```

---

TODO: a way to _wrap_ the return value so that the media type can be retrieved
