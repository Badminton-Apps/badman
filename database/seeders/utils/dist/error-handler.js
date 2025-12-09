"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSeederError = handleSeederError;
exports.withErrorHandling = withErrorHandling;
/**
 * Handle and log seeder errors with consistent formatting
 */
function handleSeederError(err, operation) {
    const error = err;
    console.error(`❌ Error ${operation}:`);
    console.error("  Message:", error.message);
    console.error("  Code:", error.parent?.code);
    console.error("  Detail:", error.parent?.detail);
    console.error("  Constraint:", error.parent?.constraint);
    console.error("  SQL:", error.sql);
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
