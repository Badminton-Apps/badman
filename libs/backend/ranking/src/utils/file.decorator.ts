import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

export const File = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest() as FastifyRequest & {
      incomingFile: Express.Multer.File;
    };
    const file = req?.['incomingFile'];
    return file 
  }
);

export interface MultipartFile {
  toBuffer: () => Promise<Buffer>;
  file: NodeJS.ReadableStream;
  filepath: string;
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  fields: import("@fastify/multipart").MultipartFields;
}
