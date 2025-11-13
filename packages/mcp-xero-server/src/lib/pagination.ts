/**
 * Cursor-based pagination utilities per MCP Protocol Revision 2025-03-26
 *
 * Implements opaque, stable cursors for efficient pagination without exposing
 * internal pagination mechanics to clients.
 */

export interface PaginationCursor {
  offset: number;
  timestamp: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  nextCursor?: string;
}

/**
 * Encode pagination state into an opaque cursor token
 *
 * @param offset - Current offset in result set
 * @param pageSize - Number of items per page
 * @returns Base64-encoded opaque cursor string
 */
export function encodeCursor(offset: number, pageSize: number): string {
  const cursor: PaginationCursor = {
    offset,
    timestamp: Date.now(),
    pageSize,
  };
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

/**
 * Decode cursor token back to pagination state
 *
 * @param cursor - Base64-encoded cursor string
 * @returns Decoded pagination cursor
 * @throws Error if cursor is invalid or malformed
 */
export function decodeCursor(cursor: string): PaginationCursor {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as PaginationCursor;

    // Validate cursor structure
    if (
      typeof parsed.offset !== 'number' ||
      typeof parsed.timestamp !== 'number' ||
      typeof parsed.pageSize !== 'number'
    ) {
      throw new Error('Invalid cursor structure');
    }

    // Check cursor age (expire after 1 hour)
    const age = Date.now() - parsed.timestamp;
    if (age > 3600000) {
      throw new Error('Cursor expired (max age: 1 hour)');
    }

    return parsed;
  } catch (error) {
    throw new Error(`Invalid cursor: ${error instanceof Error ? error.message : 'malformed token'}`);
  }
}

/**
 * Create a paginated response with nextCursor if more results exist
 *
 * @param items - Array of items for current page
 * @param totalFetched - Total number of items fetched (including current page)
 * @param pageSize - Number of items per page
 * @param currentOffset - Current offset in result set
 * @returns Paginated response with optional nextCursor
 */
export function createPaginatedResponse<T>(
  items: T[],
  totalFetched: number,
  pageSize: number,
  currentOffset: number
): PaginatedResponse<T> {
  const hasMore = totalFetched === pageSize;

  return {
    items,
    count: items.length,
    ...(hasMore && {
      nextCursor: encodeCursor(currentOffset + pageSize, pageSize)
    })
  };
}

/**
 * Parse pagination parameters from tool arguments
 *
 * @param args - Tool arguments containing optional cursor
 * @param defaultPageSize - Default page size if not specified in cursor
 * @returns Offset and page size for current request
 */
export function parsePaginationParams(
  args: { cursor?: string },
  defaultPageSize: number = 100
): { offset: number; pageSize: number } {
  if (!args.cursor) {
    return { offset: 0, pageSize: defaultPageSize };
  }

  const decoded = decodeCursor(args.cursor);
  return {
    offset: decoded.offset,
    pageSize: decoded.pageSize
  };
}
