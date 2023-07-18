import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
import { ModuleMetadata, FactoryProvider } from '@nestjs/common';
import { Type } from '@nestjs/common';
import { Options as JuiceOptions } from 'juice';
import { Observable } from 'rxjs';
import { PDFOptions } from 'puppeteer';

export type engine =
  | 'arc-templates'
  | 'atpl'
  | 'bracket'
  | 'dot'
  | 'dust'
  | 'eco'
  | 'ejs'
  | 'ect'
  | 'haml'
  | 'haml-coffee'
  | 'hamlet'
  | 'handlebars'
  | 'hogan'
  | 'htmling'
  | 'jade'
  | 'jazz'
  | 'jqtpl'
  | 'just'
  | 'liquid'
  | 'liquor'
  | 'lodash'
  | 'marko'
  | 'mote'
  | 'mustache'
  | 'nunjucks'
  | 'plates'
  | 'pug'
  | 'qejs'
  | 'ractive'
  | 'razor'
  | 'react'
  | 'slm'
  | 'squirrelly'
  | 'swig'
  | 'teacup'
  | 'templayed'
  | 'toffee'
  | 'twig'
  | 'underscore'
  | 'vash'
  | 'velocityjs'
  | 'walrus'
  | 'whiskers';

type ViewEngineOptions = {
  cache: boolean;
  [options: string]: unknown;
};

export interface CompileModuleOptions {
  view: ViewOptions;
  // https://github.com/Automattic/juice
  juice?: JuiceOptions;

  // option to enable debugging htmls
  debug?: boolean;
}

export interface CompileModuleRegisterOptions extends CompileModuleOptions {
  isGlobal?: boolean;
}

export interface CompileOptionsFactory {
  createCompileOptions(): CompileModuleOptions;
}

export interface CompileModuleRegisterAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  isGlobal?: boolean;
  useClass?: Type<CompileOptionsFactory>;
  useExisting?: Type<CompileOptionsFactory>;
  useFactory?: (config: ConfigService) => CompileModuleOptions;
  inject?: FactoryProvider['inject'];
}

export interface ViewOptions {
  root: string;
  engine: engine;
  extension?: string;
  engineOptions?: ViewEngineOptions;
}

export interface CompileOptions {
  pdf?: PDFOptions;

  fileName?: string;
  locals?: unknown;
}

export interface CompileInterface {
  toFile(template: string, options?: CompileOptions): Observable<string>;
  toReadable(template: string, options?: CompileOptions): Observable<Readable>;
  toBuffer(template: string, options?: CompileOptions): Observable<Buffer>;
}
