export async function runParallel<T>(promises: Promise<T>[], parallelism = 10): Promise<T[]> {
  const results: T[] = [];
  let runningPromises = 0;
  let currentIndex = 0;

  while (currentIndex < promises.length) {
    if (runningPromises < parallelism) {
      const promise = promises[currentIndex];
      currentIndex++;
      runningPromises++;

      const result = await promise;
      results.push(result);
      runningPromises--;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
      // Adjust the delay time (e.g., 100 milliseconds) to balance performance and responsiveness
    }
  }

  await Promise.all(promises); // Wait for all promises to complete

  return results;
}
