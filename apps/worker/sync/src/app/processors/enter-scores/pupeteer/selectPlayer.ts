import { Page } from 'puppeteer';
import { waitForSelectors } from '@badman/backend-pupeteer';

export async function selectPlayer(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
  memberId: string,
  player: 't1p1' | 't1p2' | 't2p1' | 't2p2',
  matchId: string,
) {
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }
  const selector = `#match_${matchId}_${player}`;
  {
    const targetPage = page;
    const element = await waitForSelectors([[selector]], targetPage, timeout);
    await element.click({ offset: { x: 232, y: 15 } });
  }
  {
    const targetPage = page;
    const option = await waitForSelectors([[selector]], targetPage, timeout);

    const options = await option.$$('option');
    let selectedOption = null;

    // pass the single handle below
    for (const currentOption of options) {
      const optionContent = await page.evaluate((el) => el.textContent, currentOption);

      if (!optionContent) {
        continue;
      }

      if (optionContent.indexOf(memberId) > -1) {
        selectedOption = currentOption;
      }
    }
    if (!selectedOption) {
      console.error(`Could not find player ${memberId} in select`);
    }

    const optionValue = await page.evaluate((el) => el.value, selectedOption ?? options[3]);
    // await option.type(optionValue);

    await option.focus();
    await option.evaluate((el) => {
      // todo check if this is needed
      // el['value'] = value;

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, optionValue);
  }
}
