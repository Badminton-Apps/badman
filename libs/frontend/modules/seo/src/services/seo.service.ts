import { isPlatformBrowser, PlatformLocation } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ISeoConfig } from '../interfaces/seo-config.interface';
import { SEO_CONFIG } from '../seo.module';

type ISeoMetaData = {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  type?: 'article' | 'website';
  image?: string;
};

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private config = inject<ISeoConfig>(SEO_CONFIG);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private platformId = inject<string>(PLATFORM_ID);
  private platformLocation = inject(PlatformLocation);

  async update(data: ISeoMetaData) {
    this.setType('website');
    this.setTitle(data?.title);
    this.setDescription(data?.description);
    this.setKeywords(data?.keywords);
    this.setAuthor(data?.author);
    this.setType(data?.type);

    if (this.config.siteName) {
      this.setSiteName(this.config.siteName);
    }

    if (data?.image) {
      this.setImage(data?.image);
    } else {
      if (data?.title && data?.description) {
        // const url = `https://via.placeholder.com/1200x627?text=${encodeURIComponent(
        //   data.title
        // )}`;
        // const url = `${this.config.imageEndpoint}/?title=${encodeURIComponent(
        //   data.title,
        // )}&description=${encodeURIComponent(data.description)}`;
        // this.setImage(url);
      }
    }

    if (isPlatformBrowser(this.platformId)) {
      // This also works on server side, but generates wrong url
      this.setUrl(this.platformLocation.href);
    }
  }

  setMetaTag(
    attr: 'name' | 'property' | 'itemprop',
    attrValue: string,
    content?: string | undefined,
    selector?: string,
  ) {
    if (content) {
      this.metaService.updateTag({ [attr]: attrValue, content }, selector);
    } else {
      this.metaService.removeTag(`${attr}='${attrValue}'`);
    }
  }

  private setDescription(description?: string): void {
    this.setMetaTag('name', 'description', description);
    this.setMetaTag('name', 'twitter:description', description);
    this.setMetaTag('property', 'og:description', description);
    this.setMetaTag('itemprop', 'description', description, `itemprop='description'`);
  }

  private setType(type?: 'article' | 'website'): void {
    this.setMetaTag('property', 'og:type', type);
  }

  private setKeywords(keywords?: string | string[]) {
    const wordsAsString = keywords instanceof Array ? keywords?.join(',') : keywords;
    this.setMetaTag('name', 'keywords', wordsAsString);
  }

  private setAuthor(author?: string) {
    this.setMetaTag('name', 'author', author);
    this.setMetaTag('name', 'article:author', author);
  }

  private setSiteName(siteName?: string) {
    this.setMetaTag('name', 'og:site_name', siteName);
  }

  private setUrl(url: string): void {
    this.setMetaTag('name', 'og:url', url);
  }

  private setTitle(title?: string): void {
    if (title) {
      this.titleService.setTitle(title);
    }
    this.setMetaTag('name', 'title', title);
    this.setMetaTag('name', 'twitter:title', title);
    this.setMetaTag('name', 'twitter:image:alt', title);
    this.setMetaTag('property', 'og:title', title);
    this.setMetaTag('property', 'og:image:alt', title);
    this.setMetaTag('itemprop', 'name', title, `itemprop='name'`);
  }

  private setImage(url?: string): void {
    this.setMetaTag('name', 'twitter:image', url);
    this.setMetaTag('property', 'og:image', url, `itemprop='image'`);
  }
}
