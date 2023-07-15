import moment from 'moment';

export const getCurrentSeasonPeriod = (season?: number) => {
  if (!season) {
    season = getCurrentSeason();
  }
  return [`${season}-08-01`, `${season + 1}-07-01`];
};

export const getCurrentSeason = (inputDate?: Date | moment.Moment) => {
  let date = moment(inputDate);
  if (!date.isValid()) {
    date = moment();
  }

  return date.month() >= 4 ? date.year() : date.year() - 1;
};
