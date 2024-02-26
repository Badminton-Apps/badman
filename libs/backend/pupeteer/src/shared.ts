import { ElementHandle, launch, Page } from 'puppeteer';

export async function getBrowser(headless = true, args = []) {
  console.log(`Launching browser with headless: ${headless} and args: ${args.join(' ')}`);

  return await launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      ...args
      // '--single-process',
      // '--disable-dev-shm-usage', (allows for more memory, but doesn't work on the 512 MB instance)
    ],
  });
}


export async function waitForSelector(
  selector: string[] | string,
  frame: Page,
  timeout?: number,
  options: {
    visible?: boolean;
  } = {
    visible: false,
  },
) {
  if (selector instanceof Array) {
    let element: ElementHandle<Element> | null = null;
    for (const part of selector) {
      if (!element) {
        element = await frame.waitForSelector(part, {
          timeout,
          visible: options.visible,
        });
      } else {
        element = await element.$(part);
      }
      if (!element) {
        throw new Error('Could not find element: ' + part);
      }
      element = (
        await element.evaluateHandle((el) => (el.shadowRoot ? el.shadowRoot : el))
      ).asElement() as ElementHandle<Element>;
    }
    if (!element) {
      throw new Error('Could not find element: ' + selector.join('|'));
    }
    return element;
  }
  const element = await frame.waitForSelector(selector, { timeout });
  if (!element) {
    throw new Error('Could not find element: ' + selector);
  }
  return element;
}


export async function querySelectorsAll(selectors: string[], frame: Page) {
  for (const selector of selectors) {
    const result = await querySelectorAll(selector, frame);
    if (result.length) {
      return result;
    }
  }
  return [];
}

export async function querySelectorAll(selector: string | string[], frame: Page) {
  if (selector instanceof Array) {
    let elements: ElementHandle<Element>[] = [];
    let i = 0;
    for (const part of selector) {
      if (i === 0) {
        elements = await frame.$$(part);
      } else {
        const tmpElements = elements;
        elements = [];
        for (const el of tmpElements) {
          elements.push(...(await el.$$(part)));
        }
      }
      if (elements.length === 0) {
        return [];
      }
      const tmpElements = [];
      for (const el of elements) {
        const newEl = (
          await el.evaluateHandle((el) => (el.shadowRoot ? el.shadowRoot : el))
        ).asElement() as ElementHandle<Element>;
        if (newEl) {
          tmpElements.push(newEl);
        }
      }
      elements = tmpElements;
      i++;
    }
    return elements;
  }
  const element = await frame.$$(selector);
  if (!element) {
    throw new Error('Could not find element: ' + selector);
  }
  return element;
}

export async function waitForFunction(fn: () => unknown, timeout: number) {
  let isActive = true;
  setTimeout(() => {
    isActive = false;
  }, timeout);
  while (isActive) {
    const result = await fn();
    if (result) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timed out');
}

export async function waitForSelectors(selectors: string[][], frame: Page, timeout?: number) {
  for (const selector of selectors) {
    try {
      return await waitForSelector(selector, frame, timeout);
    } catch (err) {
      console.error(err);
    }
  }
  throw new Error('Could not find element for selectors: ' + JSON.stringify(selectors));
}
