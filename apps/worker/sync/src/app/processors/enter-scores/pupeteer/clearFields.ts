import { Page } from 'puppeteer';
import { waitForSelectors } from '@badman/backend-pupeteer';

export async function clearFields(
  pupeteer: {
    page: Page | null;
    timeout?: number;
  } = {
    page: null,
    timeout: 5000,
  },
) {
  const { page, timeout } = pupeteer;
  if (!page) {
    throw new Error('No page provided');
  }

  {
    const targetPage = page;
    await targetPage.evaluate(
      (x, y) => {
        window.scroll(x, y);
      },
      0,
      595,
    );
  }
  {
    const targetPage = page;
    const element = await waitForSelectors(
      [['aria/Velden legen'], ['#btnResetSubMatches']],
      targetPage,
      timeout,
    );
    await element.click({ offset: { x: 62, y: 7.015625 } });
  }
  {
    const targetPage = page;
    const element = await waitForSelectors(
      [
        ['aria/Ja'],
        [
          '#bdBase > div.ui-dialog.ui-corner-all.ui-widget.ui-widget-content.ui-front.dialogerror.ui-draggable.ui-dialog-buttons > div.ui-dialog-buttonpane.ui-widget-content.ui-helper-clearfix > div > button:nth-child(1)',
        ],
      ],
      targetPage,
      timeout,
    );
    await element.click({ offset: { x: 16.859375, y: 7.5 } });
  }
  {
    const targetPage = page;
    await targetPage.evaluate(
      () => ((<HTMLInputElement>document.getElementById('matchfield_2')).value = ''),
    );
    await targetPage.evaluate(
      () => ((<HTMLInputElement>document.getElementById('matchfield_4')).value = ''),
    );
    await targetPage.evaluate(
      () => ((<HTMLInputElement>document.getElementById('matchfield_5')).value = ''),
    );
    await targetPage.evaluate(
      () => ((<HTMLInputElement>document.getElementById('matchfield_6')).value = ''),
    );
  }
  {
    const targetPage = page;
    await targetPage.evaluate(
      (x, y) => {
        window.scroll(x, y);
      },
      0,
      0,
    );
  }
}
