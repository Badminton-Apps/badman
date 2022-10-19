import { PdfService } from '@badman/backend-pdf';
import { Controller, Logger, Post, Req, StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';

@Controller({
  path: 'pdf',
})
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(private pdfService: PdfService) {}

  @Post('team-assembly')
  async teamAssembly(@Req() req) {
    const pdf = await this.pdfService.getTeamAssemblyPdf(req.body);
    const readable = Readable.from([pdf]);
    return new StreamableFile(readable);
  }
}
