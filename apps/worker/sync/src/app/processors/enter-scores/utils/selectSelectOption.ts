import { ElementHandle } from "puppeteer";

/**
 * Reusable function to select an option in a select element by value
 * @param selectElement The select element handle
 * @param optionValue The value of the option to select
 */
export async function selectOptionByValue(
  selectElement: ElementHandle,
  optionValue: string
): Promise<void> {
  await selectElement.focus();
  await selectElement.evaluate((el, value) => {
    // Cast to HTMLSelectElement to access selectedIndex
    const select = el as HTMLSelectElement;

    // Find the index of the option with the matching value
    const index = Array.from(select.options).findIndex((opt) => opt.value === value);
    if (index !== -1) {
      select.selectedIndex = index;
    }

    // Trigger necessary events
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, optionValue);
}
