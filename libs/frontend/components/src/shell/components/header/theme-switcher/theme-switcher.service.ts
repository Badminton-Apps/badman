import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class ThemeSwitcherService {
  public defaultScheme: 'dark' | 'light' = 'dark';
  public schemes = ['dark', 'light'] as const;

  private colorScheme?: 'dark' | 'light';
  // Define prefix for clearer and more readable class names in scss files
  private colorSchemePrefix = 'color-scheme-';

  constructor(
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private _platformId: string,
    private meta: Meta,
  ) {}

  get currentActive() {
    return this.colorScheme;
  }

  _detectPrefersColorScheme() {
    // Detect if prefers-color-scheme is supported
    if (window.matchMedia('(prefers-color-scheme)').media !== 'not all') {
      // Set colorScheme to Dark if prefers-color-scheme is dark. Otherwise, set it to Light.
      this.colorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } else {
      // If the browser does not support prefers-color-scheme, set the default to dark.
      this.colorScheme = this.defaultScheme;
    }
  }

  _setColorScheme(scheme: 'dark' | 'light') {
    this.colorScheme = scheme;
    // Save prefers-color-scheme to localStorage
    localStorage.setItem('prefers-color', scheme);

    this.meta.updateTag({
      name: 'theme-color',
      content: this.colorScheme === 'dark' ? '#212121' : '#fafafa',
    });
  }

  _getColorScheme() {
    if (isPlatformServer(this._platformId)) {
      this.colorScheme = this.defaultScheme;
      return;
    }

    const localStorageColorScheme = localStorage.getItem('prefers-color') as 'dark' | 'light';
    // Check if any prefers-color-scheme is stored in localStorage
    if (localStorageColorScheme) {
      // Save prefers-color-scheme from localStorage
      this.colorScheme = localStorageColorScheme;
    } else {
      // If no prefers-color-scheme is stored in localStorage, try to detect OS default prefers-color-scheme
      this._detectPrefersColorScheme();
    }
  }

  load() {
    this.document.body.classList.remove(this.colorSchemePrefix + 'light');
    this.document.body.classList.remove(this.colorSchemePrefix + 'dark');

    this._getColorScheme();
    this.document.body.classList.add(this.colorSchemePrefix + this.colorScheme);
  }

  update(scheme: 'dark' | 'light') {
    this.document.body.classList.remove(this.colorSchemePrefix + this.colorScheme);

    this._setColorScheme(scheme);
    // Remove the old color-scheme class
    this.document.body.classList.add(this.colorSchemePrefix + this.colorScheme);
  }
}
