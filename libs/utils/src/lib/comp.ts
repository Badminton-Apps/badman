import moment from 'moment';

export const getCurrentSeasonPeriod = (season?: number) => {
  if (!season) {
    season = getCurrentSeason();
  }
  return [`${season}-09-01`, `${season + 1}-05-01`] as const;
};

export const getCurrentSeason = (inputDate?: Date | moment.Moment) => {
  let date = moment(inputDate);
  if (!date.isValid()) {
    date = moment();
  }

  return date.month() >= 4 ? date.year() : date.year() - 1;
};
