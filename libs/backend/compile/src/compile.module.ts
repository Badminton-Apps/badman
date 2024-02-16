// Started from: https://github.com/toondaey/nestjs-compile
// Imported for eaier use and configuration

import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { COMPILE_OPTIONS_TOKEN } from './constants';
import {
  CompileModuleRegisterAsyncOptions,
  CompileModuleRegisterOptions,
  CompileOptionsFactory,
} from './interfaces';
import { CompileService } from './services';

@Module({
  controllers: [],
  providers: [CompileService],
  exports: [CompileService],
})
export class CompileModule {
  static forRoot(options: CompileModuleRegisterOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: CompileModule,
      providers: [
        {
          provide: COMPILE_OPTIONS_TOKEN,
          useValue: options,
        },
      ],
    };
  }

  static forRootAsync(options: CompileModuleRegisterAsyncOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: CompileModule,
      providers: [...CompileModule.createAsyncProviders(options)],
      imports: options.imports || [],
    };
  }

  static createAsyncProviders(options: CompileModuleRegisterAsyncOptions): Provider[] {
    if (options.useFactory || options.useExisting) {
      return [CompileModule.createAsyncOptionsProvider(options)];
    }

    const useClass = options.useClass as Type<CompileOptionsFactory>;
    return [
      CompileModule.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  static createAsyncOptionsProvider(options: CompileModuleRegisterAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: COMPILE_OPTIONS_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const inject = [(options.useClass || options.useExisting) as Type<CompileOptionsFactory>];

    return {
      provide: COMPILE_OPTIONS_TOKEN,
      useFactory: (factory: CompileOptionsFactory) => factory.createCompileOptions(),
      inject,
    };
  }
}
