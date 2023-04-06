import moment from 'moment';

export const compPeriod = (year?: number) => {
  if (!year) {
    year = getCurrentSeason();
  }
  return [`${year}-08-01`, `${year + 1}-07-01`];
};

export const getCurrentSeason = (inputDate?: Date | moment.Moment) => {
  let date = moment(inputDate);
  if (!date.isValid()) {
    date = moment();
  }

  return date.month() >= 6 ? date.year() : date.year() - 1;
};
