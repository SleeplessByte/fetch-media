# fetch-media

Utility function that uses fetch to fetch a media-enabled resource

## Installation

```bash
yarn add fetch-media
```

If you're using `react-native`, this will use the unbundled source _TypeScript_. As such, the normally rolled-up dependency `@ungap/url-search-params` isn't available.

You **must** install this dependency.

```bash
yarn add @ungap/url-search-params
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

You can use `fetchMediaWrapped` to get the full response (so you can read out headers)