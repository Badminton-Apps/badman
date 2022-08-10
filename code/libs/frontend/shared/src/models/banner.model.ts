export class Banner {
  constructor(
    public adClient: string,
    public adSlot: number,
    public adFormat: string,
    public fullWidthResponsive: boolean
  ) {
    this.adClient = adClient;
    this.adSlot = adSlot;
    this.adFormat = adFormat || 'auto';
    this.fullWidthResponsive = fullWidthResponsive || true;
  }
}
