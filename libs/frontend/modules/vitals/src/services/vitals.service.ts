import { Injectable, inject } from '@angular/core';
import { Metric, onCLS, onFCP, onFID, onLCP, onTTFB } from 'web-vitals';
import { ANALYTICS_CONFIG_TOKEN, AnalyticsConfig } from '../vitals.module';

@Injectable({
  providedIn: 'root',
})
export class WebVitalsService {
  private config = inject<AnalyticsConfig>(ANALYTICS_CONFIG_TOKEN);

  public init(): void {
    this.reportWebVitals((data) => this.sendWebVitals(data));
  }

  private reportWebVitals(onReport: (data: Metric) => void) {
    try {
      onFID((metric) => onReport(metric));
      onTTFB((metric) => onReport(metric));
      onLCP((metric) => onReport(metric));
      onCLS((metric) => onReport(metric));
      onFCP((metric) => onReport(metric));
    } catch (e) {
      console.error(e);
    }
  }

  private sendWebVitals(data: Metric) {
    const body = {
      dsn: this.config.analyticsId,
      id: data.id,
      page: window.location.pathname,
      href: window.location.href,
      event_name: data.name,
      value: data.value.toString(),
      speed: this.getConnectionSpeed(),
    };

    const blob = new Blob([new URLSearchParams(body).toString()], {
      // This content type is necessary for `sendBeacon`
      type: 'application/x-www-form-urlencoded',
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.config.url, blob);
    } else
      fetch(this.config.url, {
        body: blob,
        method: 'POST',
        credentials: 'omit',
        keepalive: true,
      });
  }

  private getConnectionSpeed(): string {
    if (
      'connection' in navigator &&
      navigator['connection'] != null &&
      typeof navigator['connection'] === 'object' &&
      'effectiveType' in navigator['connection']
    ) {
      return (navigator['connection']['effectiveType'] as string) || '';
    }

    return '';
  }
}
