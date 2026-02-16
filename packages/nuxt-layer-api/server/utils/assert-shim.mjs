// Shim for CJS/ESM interop: follow-redirects calls assert() as a function.
// Rollup's getDefaultExportFromNamespaceIfNotNamed returns the namespace
// (non-callable) when there are multiple named exports. This shim re-exports
// only the default so the helper returns the callable function.
import assert from 'node:assert';

export default assert;
