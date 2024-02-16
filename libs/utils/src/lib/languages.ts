export enum AvaliableLanguages {
  'en' = 'en',
  'fr_BE' = 'fr_BE',
  'nl_BE' = 'nl_BE',
}

export const languages: Map<
  AvaliableLanguages,
  { translate: string; adapter: string; moment: string }
> = new Map([
  [AvaliableLanguages.en, { translate: 'en', adapter: 'en', moment: 'en' }],
  [AvaliableLanguages.fr_BE, { translate: 'fr_BE', adapter: 'fr', moment: 'fr' }],
  [AvaliableLanguages.nl_BE, { translate: 'nl_BE', adapter: 'nl-be', moment: 'nl-be' }],
]);
