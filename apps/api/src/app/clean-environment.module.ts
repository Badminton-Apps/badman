import { DynamicModule, Module } from '@nestjs/common'
import { parse } from 'dotenv'
import fs from 'fs'

@Module({})
export class CleanEnvironmentModule {
  /**
   * Remove all variables available in .env file from process.env
   *
   * @param environmentFilePath
   * @param predicate
   */
  static forPredicate (environmentFilePath?: string, predicate?: () => boolean): DynamicModule {
    if (predicate === undefined || predicate()) {
      const environmentData = fs.readFileSync(environmentFilePath ?? '.env', { encoding: 'utf8' })

      const parsed = new Set(Object.keys(parse(environmentData)))

      for (const name of Object.keys(process.env)) {
        if (parsed.has(name)) {
          delete process.env[name]
        }
      }
    }


    return {
      module: CleanEnvironmentModule
    }
  }
}