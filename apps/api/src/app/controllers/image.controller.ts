import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { createCanvas } from 'canvas';
import { FastifyReply } from 'fastify';
import { existsSync } from 'fs';
import { join } from 'path';

@Controller({
  path: 'image',
})
export class ImageController {
  private readonly logger = new Logger(ImageController.name);

  constructor() {
    const path = join(__dirname, 'assets', 'PTSans-Regular.ttf');

    // check if file exists
    if (existsSync(path)) {
      // registerFont(path, { family: 'PT Sans' });
    } else {
      this.logger.warn('Font file does not exist', path);
    }
  }

  @Get('/')
  async getImage(@Res() res: FastifyReply, @Query() query: { title: string; description: string }) {
    const title = this.formatTitle(query.title);
    const description = query.description;

    const width = 1200;
    const height = 627;

    const titleY = title.length === 2 ? 250 : 300;
    const titleLineHeight = 100;
    const authorY = title.length === 2 ? 525 : 500;

    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    context.fillStyle = '#764abc';
    context.fillRect(0, 0, width, height);

    context.font = "bold 70pt 'PT Sans'";
    context.textAlign = 'center';
    context.fillStyle = '#fff';

    context.fillText(title[0], 600, titleY);
    if (title[1]) {
      context.fillText(title[1], 600, titleY + titleLineHeight);
    }

    if (description) {
      context.font = "40pt 'PT Sans'";
      context.fillText(`${description}`, 600, authorY);
    }

    const image = canvas.toBuffer('image/png');

    // elapsed time

    res.headers({
      'Content-Type': 'image/png',
      'Content-Length': image.length,
    });

    res.type('image/png').send(image);
  }

  private getMaxNextLine(input: string, maxChars = 17) {
    // Split the string into an array of words.
    const allWords = input.split(' ');
    // Find the index in the words array at which we should stop or we will exceed
    // maximum characters.
    // Find the index in the words array at which we should stop or we will exceed
    const lineIndex = allWords.reduce(
      (
        prev: { done: boolean; index: number; position?: number | undefined },
        cur: string,
        index: number,
      ): { done: boolean; index: number; position?: number | undefined } => {
        if (prev?.done) return prev;
        const endLastWord: number = prev?.position || 0;
        const position: number = endLastWord + 1 + cur.length;
        return position >= maxChars ? { done: true, index } : { done: false, position, index };
      },
      { done: false, index: -1, position: undefined },
    );

    // Using the index, build a string for this line ...
    const line = allWords.slice(0, lineIndex.index).join(' ');
    // And determine what's left.
    const remainingChars = allWords.slice(lineIndex.index).join(' ');
    // Return the result.
    return { line, remainingChars };
  }

  private formatTitle(title: string) {
    let output = [];
    // If the title is 40 characters or longer, look to add ellipses at the end of
    // the second line.
    if (title.length >= 40) {
      const firstLine = this.getMaxNextLine(title);
      const secondLine = this.getMaxNextLine(firstLine.remainingChars);
      output = [firstLine.line];
      let fmSecondLine = secondLine.line;
      if (secondLine.remainingChars.length > 0) fmSecondLine += ' ...';
      output.push(fmSecondLine);
    }
    // If 20 characters or longer, add the entire second line, using a max of half
    // the characters, making the first line always slightly shorter than the
    // second.
    else if (title.length >= 20) {
      const firstLine = this.getMaxNextLine(title, title.length / 2);
      output = [firstLine.line, firstLine.remainingChars];
    }
    // Otherwise, return the short title.
    else {
      output = [title];
    }

    return output;
  }
}
