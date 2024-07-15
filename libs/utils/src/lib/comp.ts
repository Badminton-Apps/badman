import moment from 'moment';

export const getSeasonPeriod = (season?: number) => {
  if (!season) {
    season = getSeason();
  }
  return [`${season}-09-01`, `${season + 1}-04-01`] as const;
};

export const getSeason = (inputDate?: Date | moment.Moment) => {
  let date = moment(inputDate);
  if (!date.isValid()) {
    date = moment();
  }

  return date.month() >= 4 ? date.year() : date.year() - 1;
};

export const getNextSeason = (inputDate?: Date | moment.Moment) => {
  let date = moment(inputDate);
  if (!date.isValid()) {
    date = moment();
  }

  return date.month() >= 9 ? date.year() + 1 : date.year();
};

export const startOfSeason = (season: number) => {
  return moment([season, 6, 1]);
};

export const endOfSeason = (season: number) => {
  return moment([season + 1, 5, 1]).endOf('month');
};
