import { getRankingWhenNull } from './get-ranking-when-null';

describe('getRanking', () => {
  const system = {
    amountOfLevels: 12,
    maxDiffLevels: 2,
  };

  it('Should update the single to best ranking + 2', () => {
    const ranking = {
      single: null,
      double: 2,
      mix: 3,
    };
    const expectedRanking = {
      single: 4,
      double: 2,
      mix: 3,
    };
    expect(getRankingWhenNull(ranking, system)).toEqual(expectedRanking);
  });

  it('Should update the double to best ranking + 2', () => {
    const ranking = {
      single: 5,
      double: null,
      mix: 3,
    };
    const expectedRanking = {
      single: 5,
      double: 5,
      mix: 3,
    };
    expect(getRankingWhenNull(ranking, system)).toEqual(expectedRanking);
  });

  it('Should update the mix to best ranking + 2', () => {
    const ranking = {
      single: 5,
      double: 7,
      mix: null,
    };
    const expectedRanking = {
      single: 5,
      double: 7,
      mix: 7,
    };
    expect(getRankingWhenNull(ranking, system)).toEqual(expectedRanking);
  });

  it('should return the correct ranking when all values are maxlevel', () => {
    const ranking = {
      single: 12,
      double: 12,
      mix: null,
    };
    const expectedRanking = {
      single: 12,
      double: 12,
      mix: 12,
    };
    expect(getRankingWhenNull(ranking, system)).toEqual(expectedRanking);
  });

  it('should return the correct ranking multiple rankings are unkown', () => {
    const ranking = {
      single: 9,
      double: null,
      mix: null,
    };
    const expectedRanking = {
      single: 9,
      double: 11,
      mix: 11,
    };
    expect(getRankingWhenNull(ranking, system)).toEqual(expectedRanking);
  });

  it('should return the correct ranking with all rankings combined', () => {
    const ranking = {
      single: 10,
      double: 10,
      mix: null,
    };
    const expectedRanking = {
      single: 10,
      double: 10,
      mix: 12,
    };
    expect(getRankingWhenNull(ranking, system)).toEqual(expectedRanking);
  });
});
