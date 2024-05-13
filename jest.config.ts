import { getJestProjects } from '@nx/jest';

export default {
  projects: getJestProjects(),
  testTimeout: 1000 * 60 * 10,
};
