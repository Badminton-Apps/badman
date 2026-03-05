"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSeederError = handleSeederError;
exports.withErrorHandling = withErrorHandling;
/** PostgreSQL error code: current transaction is aborted */
const PG_TRANSACTION_ABORTED = "25P02";
/**
 * Handle and log seeder errors with consistent formatting
 */
function handleSeederError(err, operation) {
    const error = err;
    const code = error.parent?.code ?? error.code;
    console.error(`❌ Error ${operation}:`);
    console.error("  Message:", error.message);
    console.error("  Code:", code);
    console.error("  Detail:", error.parent?.detail);
    console.error("  Constraint:", error.parent?.constraint);
    console.error("  SQL:", error.sql);
    if (code === PG_TRANSACTION_ABORTED) {
        console.error("  Hint: This usually means a previous command in the same transaction failed. Scroll up for the first error (e.g. duplicate key, constraint violation).");
    }
    console.error("  Full error:", JSON.stringify(error, null, 2));
    throw error;
}
/**
 * Wrap a function with error handling
 */
function withErrorHandling(fn, operation) {
    return (async (...args) => {
        try {
            return await fn(...args);
        }
        catch (err) {
            handleSeederError(err, operation);
        }
    });
}
