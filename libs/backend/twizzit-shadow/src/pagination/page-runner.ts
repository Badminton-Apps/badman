/**
 * Generic offset-based page loop.
 *
 * Calls `fetchPage(offset, pageSize)` repeatedly, sleeping `interPageDelayMs`
 * between pages. Stops when the handler returns `false` (caller signals
 * exhaustion or error). Does NOT contain any checkpoint or truncate logic —
 * those are handled by the ingest service.
 */
export interface PageRunnerOptions {
  pageSize: number;
  interPageDelayMs: number;
  startOffset?: number;
}

export type FetchPageFn<T> = (offset: number, pageSize: number) => Promise<T[]>;

export type HandlePageFn<T> = (
  items: T[],
  offset: number
) => Promise<boolean | void>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a paginated fetch loop.
 *
 * @param fetchPage  Called with (offset, pageSize) → items for that page.
 * @param handlePage Called with (items, offset). Return `false` to stop the loop early.
 * @param opts       Pagination configuration.
 */
export async function runPageLoop<T>(
  fetchPage: FetchPageFn<T>,
  handlePage: HandlePageFn<T>,
  opts: PageRunnerOptions
): Promise<void> {
  const { pageSize, interPageDelayMs, startOffset = 0 } = opts;
  let offset = startOffset;
  let firstPage = true;

  while (true) {
    const items = await fetchPage(offset, pageSize);
    const shouldContinue = await handlePage(items, offset);

    if (shouldContinue === false) {
      break;
    }

    if (items.length < pageSize) {
      // Natural end: federation returned a short page
      break;
    }

    offset += pageSize;

    if (!firstPage || offset > startOffset) {
      await sleep(interPageDelayMs);
    }
    firstPage = false;
  }
}
