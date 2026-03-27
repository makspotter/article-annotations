import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ruPlural',
  pure: true,
})
export class RuPluralPipe implements PipeTransform {
  transform(count: number, forms: [string, string, string]): string {
    const n = Math.abs(Math.trunc(count));
    const last = n % 10;
    const last2 = n % 100;

    if (last === 1 && last2 !== 11) {
      return forms[0];
    }

    if (last >= 2 && last <= 4 && (last2 < 12 || last2 > 14)) {
      return forms[1];
    }

    return forms[2];
  }
}
