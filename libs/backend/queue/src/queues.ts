export const RankingQueue = 'ranking';
export const SyncQueue = 'sync';

export const Badminton = {
  Belgium: {
    Flanders: {
      Points: 'badminton-belgium-flanders-points',
      Places: 'badminton-belgium-flanders-places',
    },
  },
};

export type QueueName = typeof RankingQueue | typeof SyncQueue;