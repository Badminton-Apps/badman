import { Page } from 'puppeteer';
import { waitForSelectors } from '@badman/backend-pupeteer';

export async function enterScores(
  pupeteer: {
    page: Page;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  set: number,
  scores: string,
  matchId: string
) {
  const { page, timeout } = pupeteer;
  const selector = `#match_${matchId}_set_${set}`;
  {
    const targetPage = page;
    const element = await waitForSelectors([[selector]], targetPage, timeout);
    await element.type(scores);
  }
}
