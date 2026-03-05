import { BaseError } from "sequelize";

/**
 * Seeder error with additional context
 */
export interface SeederError extends Error {
  parent?: {
    code?: string;
    detail?: string;
    constraint?: string;
  };
  sql?: string;
}

/** PostgreSQL error code: current transaction is aborted */
const PG_TRANSACTION_ABORTED = "25P02";

/**
 * Handle and log seeder errors with consistent formatting
 */
export function handleSeederError(err: SeederError | BaseError, operation: string): never {
  const error = err as SeederError;
  const code = error.parent?.code ?? (error as { code?: string }).code;
  console.error(`❌ Error ${operation}:`);
  console.error("  Message:", error.message);
  console.error("  Code:", code);
  console.error("  Detail:", error.parent?.detail);
  console.error("  Constraint:", error.parent?.constraint);
  console.error("  SQL:", error.sql);
  if (code === PG_TRANSACTION_ABORTED) {
    console.error(
      "  Hint: This usually means a previous command in the same transaction failed. Scroll up for the first error (e.g. duplicate key, constraint violation)."
    );
  }
  console.error("  Full error:", JSON.stringify(error, null, 2));
  throw error;
}

/**
 * Wrap a function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operation: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (err) {
      handleSeederError(err as SeederError, operation);
    }
  }) as T;
}
