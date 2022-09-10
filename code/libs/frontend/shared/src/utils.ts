import { FormGroup, FormControl } from '@angular/forms';
import { SortDirection } from '@angular/material/sort';
import { SubEventCompetition, Team } from '@badman/frontend/models';
import moment from 'moment';

export const validateAllFormFields = (formGroup: FormGroup) => {
  Object.keys(formGroup.controls).forEach((field) => {
    const control = formGroup.get(field);
    if (control instanceof FormControl) {
      control.markAsTouched({ onlySelf: true });
    } else if (control instanceof FormGroup) {
      validateAllFormFields(control);
    }
  });
};

export const resetAllFormFields = (formGroup: FormGroup) => {
  Object.keys(formGroup.controls).forEach((field) => {
    const control = formGroup.get(field);
    if (control instanceof FormControl) {
      control.markAsUntouched({ onlySelf: true });
      control.reset();
      control.setErrors(null);
    } else if (control instanceof FormGroup) {
      resetAllFormFields(control);
    }
  });
};

export const sortSubEvents = (
  a: SubEventCompetition,
  b: SubEventCompetition
) => {
  if (a.eventType === b.eventType) {
    return (a.level ?? 0) - (b.level ?? 0);
  }

  return (a.eventType ?? '').localeCompare(b.eventType ?? '');
};

export const sortTeams = (a: Team, b: Team) => {
  if (a.type === b.type) {
    return (a.teamNumber ?? 0) - (b.teamNumber ?? 0);
  }

  return (a.type ?? '').localeCompare(b.type ?? '');
};

export interface pageArgs {
  take?: number;
  skip?: number;
  query?: string;
  order?: { field: string; direction: SortDirection | 'ASC' | 'DESC' }[];
  ids?: string[];
  where?: { [key: string]: unknown };
}

export const getQueryParamsFromPageArgs = (
  args: pageArgs,
  defaultArgs: pageArgs
) => {
  // Check if order is same as default:
  const order = args.order?.map((x) => `${x.field}-${x.direction}`).join(',');
  const defaultOrder = defaultArgs.order
    ?.map((x) => `${x.field}-${x.direction}`)
    .join(',');

  const getKeys = (key: string, value: unknown, parent?: string) => {
    key = parent ? `${parent}.${key}` : key;

    if (value == null || value == undefined) {
      return '';
    } else if (Array.isArray(value)) {
      return `${key}=${value.join(',')}`;
    } else if (typeof value === 'object') {
      const keys = Object.keys(value as object);
      const values = keys.map((k) => getKeys(k, value?.[k], key));
      return values.join('&');
    } else {
      return `${key}=${value}`;
    }
  };

  const getWhere = (where: { [key: string]: unknown }) => {
    const keys = Object.keys(where);
    const values = keys
      .map((k) => getKeys(k, where[k]))
      ?.filter((v) => v.length > 0);
    return values.join('&');
  };

  // Convert where to dot notation
  const where = getWhere(args.where ?? {});
  const defaultWhere = getWhere(defaultArgs.where ?? {});

  return {
    take: args.take == (defaultArgs.take ?? 15) ? undefined : args.take,
    skip: args.skip == (defaultArgs.skip ?? 0) ? undefined : args.skip,
    order: order == defaultOrder ? undefined : order,
    where: where == defaultWhere ? undefined : where,
  };
};

export const getPageArgsFromQueryParams = (queryParams: {
  [key: string]: string;
}) => {
  const pageArgs: pageArgs = {};

  const order = queryParams['order'];
  if (order?.length > 0) {
    pageArgs.order = [];
    for (const o of order.split(',')) {
      const [field, direction] = o.split('-');
      pageArgs.order.push({ field, direction: direction as SortDirection });
    }
  }

  if (queryParams['where']) {
    const where = queryParams['where'].split('&').reduce((acc, cur) => {
      const [key, value] = cur.split('=');
      const parts = key.split('.');
      if (parts.length > 1) {
        const parent = parts.slice(0, -1).join('.');
        const child = parts.slice(-1)[0];
        if (!acc[parent]) {
          acc[parent] = {};
        }
        acc[parent][child] = value;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
    pageArgs.where = where;
  }

  pageArgs.skip = parseInt(queryParams['skip'], 10) || 0;
  pageArgs.take = parseInt(queryParams['take'], 10) || (15 as number);
  return pageArgs;
};

export const compPeriod = (year?: number) => {
  if (!year) {
    year = getCompetitionYear();
  }
  return [`${year}-08-01`, `${year + 1}-07-01`];
};

export const getCompetitionYear = (inputDate?: Date | moment.Moment) => {
  let date = moment(inputDate);
  if (!date.isValid()) {
    date = moment();
  }

  return date.month() >= 6 ? date.year() : date.year() - 1;
};
