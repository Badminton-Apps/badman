export const splitInChunks = (array, sizeChunks = 500) => {
  if (!Array.isArray(array)) {
    array = [array];
  }
  const newArray = [];

  while (array.length) {
    const chunk = array.splice(0, sizeChunks);
    newArray.push(chunk);
  }

  return newArray;
};
