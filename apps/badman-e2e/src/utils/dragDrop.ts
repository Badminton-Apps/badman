import { Page, Locator } from '@playwright/test';

export const dragDrop = async (page: Page, originElement: Locator, destinationElement: Locator) => {
  // check if we can have bot elements on screen
  await originElement.scrollIntoViewIfNeeded();
  await destinationElement.scrollIntoViewIfNeeded();

  if (!(await originElement.isVisible())) {
    throw new Error('Origin element is not visible');
  }

  if (!(await destinationElement.isVisible())) {
    throw new Error('Destination element is not visible');
  }

  await originElement.hover();
  await page.mouse.down();
  const box = (await destinationElement.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await destinationElement.hover();
  await page.mouse.up();
};
