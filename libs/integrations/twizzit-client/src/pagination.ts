import type { Logger } from "./logger";
import { TwizzitClientError } from "./errors";

const DEFAULT_PAGE_SIZE = 100;

/**
 * Internal safety cap. Only trips if Twizzit ever streams pages forever
 * (e.g. server bug returning duplicate full pages). Not user-configurable —
 * production sync of a real federation tenant must be able to traverse arbitrarily
 * large datasets, so we cannot impose a meaningful user-visible page cap.
 *
 * 100_000 pages × any sane pageSize is well beyond every federation we'd realistically
 * face; if you ever hit this you have a much bigger problem than truncated data.
 */
const RUNAWAY_PAGE_LIMIT = 100_000;

export interface PaginateOptions<T> {
  fetchPage: (offset: number, limit: number) => Promise<T[]>;
  /** Items per page. Default 100. */
  pageSize?: number;
  /**
   * Optional truncation bound. When set, the loop stops after this many pages and
   * returns whatever has been collected so far (a warning is logged). When unset,
   * the loop fetches every page until the federation returns a non-full page —
   * which is the behaviour required for a complete federation→Badman sync.
   */
  maxPages?: number;
  /**
   * Optional starting byte offset (in items). When set, the first fetch starts at
   * this absolute offset rather than 0. Used by shadow-sync checkpointed pagination.
   */
  startOffset?: number;
  endpointLabel: string;
  logger?: Logger;
}

export async function paginate<T>(opts: PaginateOptions<T>): Promise<T[]> {
  const { fetchPage, endpointLabel, logger } = opts;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = opts.maxPages;

  if (pageSize <= 0) {
    throw new TwizzitClientError(
      `Invalid pageSize: ${pageSize}`,
      { endpoint: endpointLabel, occurredAt: new Date().toISOString(), attempts: 1 },
      0,
      "",
      "bad-pagination-arg"
    );
  }

  const results: T[] = [];
  const startOffset = opts.startOffset ?? 0;
  const startPage = pageSize > 0 ? Math.floor(startOffset / pageSize) : 0;
  let page = startPage;

  while (true) {
    // User-supplied truncation bound: counts pages from startPage, not from 0.
    const pagesElapsed = page - startPage;
    if (maxPages !== undefined && pagesElapsed >= maxPages) {
      logger?.warn("paginate: maxPages reached; returning partial result", {
        endpoint: endpointLabel,
        pages: pagesElapsed,
        items: results.length,
        maxPages,
      });
      return results;
    }

    // Internal safety net: only trips on pathological federation behaviour.
    if (page >= RUNAWAY_PAGE_LIMIT) {
      throw new TwizzitClientError(
        `Pagination runaway: ${RUNAWAY_PAGE_LIMIT} pages without exhaustion on ${endpointLabel}`,
        { endpoint: endpointLabel, occurredAt: new Date().toISOString(), attempts: page },
        0,
        "",
        "pagination-runaway"
      );
    }

    const offset = page * pageSize;
    if (pagesElapsed > 0 && pagesElapsed % 10 === 0) {
      logger?.info("paginate: progress", { endpoint: endpointLabel, page, items: results.length });
    }
    const items = await fetchPage(offset, pageSize);
    results.push(...items);
    page++;

    // Natural exhaustion: federation returned a short page.
    if (items.length < pageSize) {
      break;
    }
  }

  return results;
}
