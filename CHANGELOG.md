# Changelog

## 2.1.6

- Fix issue with some environments where `globalThis` is not declared.

## 2.1.5

- Remove not working / emitted modern export

## 2.1.4

- Use `.js` extension instead of `.mjs`.

## 2.1.3

- Use `Response` from `globalThis` or `window` instead of ambient global.

## 2.1.2

- Use fetch from `globalThis` or `window` instead of ambient global.

## 2.1.1

- Fix responses that are errors without `content-type`.

## 2.1.0

- Fix `MediaHeaders` type
- Add more headers to `KnownHeaders`
- Add more rules to remapping headers

## 2.0.0

- Add `fetchMediaWrapped`
- Add generic overloads
- Use new build system

## 1.4.1

- Rebind debug in case it's not available

## 1.4.0

- Better parsing for generic JSON Error
- Add fallback for generic JSON Error

## 1.3.2

- Fix default hooks when debug is false
- Ignore generated files

## 1.3.1

- Read out headers in debug logger

## 1.3.0

- Add before and after hook
- Add more keys to extract JSON errors
