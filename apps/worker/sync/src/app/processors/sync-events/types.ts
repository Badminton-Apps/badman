export type SyncEventJobData = {
  // Changed after date
  date?: Date;
  // Start from certain date
  startDate?: Date;
  // Skip types / event names
  skip: string[];
  // Search for namne
  search: string;
  // Exact id
  id: string | string[];
  // Official
  official?: boolean;
  // Only types / event names
  only: string[];
  // Continue from a previous (failed) run
  offset: number;
  // Only process a certain number of events
  limit: number;
  // the to notifiy user
  userId?: string | string[];
};
