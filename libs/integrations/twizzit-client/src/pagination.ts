import { TwizzitClientError } from "./errors";

const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 2000;

export interface PaginateOptions<T> {
  fetchPage: (offset: number, limit: number) => Promise<T[]>;
  pageSize?: number;
  maxPages?: number;
  endpointLabel: string;
}

export async function paginate<T>(opts: PaginateOptions<T>): Promise<T[]> {
  const { fetchPage, endpointLabel } = opts;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;

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
  let page = 0;

  while (true) {
    if (page >= maxPages) {
      throw new TwizzitClientError(
        `maxPages (${maxPages}) exceeded for ${endpointLabel}`,
        { endpoint: endpointLabel, occurredAt: new Date().toISOString(), attempts: page },
        0,
        "",
        "max-pages-exceeded"
      );
    }

    const offset = page * pageSize;
    const items = await fetchPage(offset, pageSize);
    results.push(...items);
    page++;

    if (items.length < pageSize) {
      break;
    }
  }

  return results;
}
