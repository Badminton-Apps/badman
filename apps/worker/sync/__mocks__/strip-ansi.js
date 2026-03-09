// CJS shim for strip-ansi — the root node_modules has v7 which is ESM-only,
// but string-length (used by @jest/reporters) requires a CJS-callable function.
// jest.config.ts maps strip-ansi to this file so the require() call works.
const pattern =
  // eslint-disable-next-line no-control-regex
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_+]*)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_+]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

module.exports = (string) => (typeof string === "string" ? string.replace(pattern, "") : string);
