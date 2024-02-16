export const sortPlayers = (
  a: Partial<{
    gender: string;
    single: number;
    double: number;
    mix: number;
    lastName: string;
  }>,
  b: Partial<{
    gender: string;
    single: number;
    double: number;
    mix: number;
    lastName: string;
  }>,
) => {
  // Women first
  if (a.gender === 'F' && b.gender !== 'F') {
    return -1;
  } else if (a.gender !== 'F' && b.gender === 'F') {
    return 1;
  }

  // Lowest ranking sum first
  const aSum = (a.single || 0) + (a.double || 0) + (a.mix || 0);
  const bSum = (b.single || 0) + (b.double || 0) + (b.mix || 0);
  if (aSum < bSum) {
    return -1;
  } else if (aSum > bSum) {
    return 1;
  }

  // Last name
  if (a.lastName && b.lastName) {
    return a.lastName.localeCompare(b.lastName);
  } else if (a.lastName) {
    return -1;
  } else if (b.lastName) {
    return 1;
  } else {
    return 0;
  }
};
