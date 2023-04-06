import { Injectable } from '@angular/core';
import { TranslateDefaultParser } from '@ngx-translate/core';

@Injectable()
export class SingleBracketInterpolation extends TranslateDefaultParser {
  override interpolate(expression: string, params: never): string {
    params = params || {};
    return this.replaceVariables(expression, params);
  }

  replaceVariables(str: string, data: never) {
    return str?.replace(/\{([^}]+)\}/g, (_, match) => {
      const keys = match.split('.');
      let value = data;
      for (const key of keys) {
        value = value?.[key];
      }
      return value;
    });
  }
}
