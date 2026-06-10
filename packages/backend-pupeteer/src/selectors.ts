import { ElementHandle, Page } from "puppeteer";

export async function waitForSelector(
  selector: string[] | string,
  frame: Page,
  timeout?: number,
  options: {
    visible?: boolean;
  } = {
    visible: false,
  }
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
        throw new Error("Could not find element: " + part);
      }
      element = (
        await element.evaluateHandle((el) => (el.shadowRoot ? el.shadowRoot : el))
      ).asElement() as ElementHandle<Element>;
    }
    if (!element) {
      throw new Error("Could not find element: " + selector.join("|"));
    }
    return element;
  }
  const element = await frame.waitForSelector(selector, { timeout });
  if (!element) {
    throw new Error("Could not find element: " + selector);
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
  let elements: ElementHandle<Element>[] = [];
  try {
    if (selector instanceof Array) {
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
    } else {
      elements = await frame.$$(selector);
    }
    return elements;
  } finally {
    // Clean up all element handles
    await Promise.all(elements.map((el) => el.dispose()));
  }
}

export async function waitForFunction(fn: () => unknown, timeout: number) {
  let isActive = true;
  setTimeout(() => {
    isActive = false; // This could be called after the function returns
  }, timeout);
  while (isActive) {
    const result = await fn();
    if (result) {
      return; // Function returns but setTimeout callback still executes
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out");
}

export async function waitForSelectors(selectors: string[][], frame: Page, timeout?: number) {
  const errors: Error[] = [];

  for (const selector of selectors) {
    try {
      return await waitForSelector(selector, frame, timeout);
    } catch (err) {
      errors.push(err as Error);
      // Don't log every attempt, just collect errors
    }
  }

  // This will always execute if no selector is found
  if (errors.length > 0) {
    console.error(
      "All selectors failed:",
      errors.map((e) => e.message)
    );
  }

  throw new Error("Could not find element for selectors: " + JSON.stringify(selectors));
}

// Add dispose methods for element handles
export async function disposeElement(element: ElementHandle<Element>) {
  if (element) {
    await element.dispose();
  }
}
