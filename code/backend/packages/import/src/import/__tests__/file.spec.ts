import { csvToArray } from '@badvlasim/shared';
import { join } from 'path';
import { Readable } from 'stream';
import { CompetitionCpProcessor } from '../processors';

jest.mock('child_process', () => {
  return {
    spawn: (exe: string, args: any[]) => {
      if (exe === 'mdb-export') {
        const readableStream = Readable.from('');
        return {
          stdout: readableStream,
          stderr: readableStream
        };
      }
    }
  };
});

describe('Wrong file', () => {
  let service: CompetitionCpProcessor;
  let fileLocation: string;

  beforeAll(async () => {
    fileLocation = join(process.cwd(), 'src/import/__tests__/files/competition_wrong_file.cp');

    service = new CompetitionCpProcessor();
  });

  it('Should throw error on import wrong competition', async () => {
    // Arrange
    expect.assertions(1);

    // Act
    try {
      await service.importFile(fileLocation);
    } catch (e) {
      // Assert
      expect(e?.message).toEqual("Couldn't find file.");
    }
  });
});

describe('Empty file', () => {
  let service: CompetitionCpProcessor;
  let fileLocation: string;

  beforeAll(async () => {
    fileLocation = join(process.cwd(), 'src/import/__tests__/files/empty.cp');

    service = new CompetitionCpProcessor();
  });

  it('Should throw error on import empty file', async () => {
    // Arrange
    expect.assertions(1);

    // Act
    try {
      await service.importFile(fileLocation);
    } catch (e) {
      // Assert
      expect(e?.message).toEqual('no data');
    }
  });

  test('should trhow error on empty csv', async () => {
    // Arrange
    expect.assertions(1);

    // Act
    try {
      await csvToArray('');
    } catch (e) {
      // Assert
      expect(e?.message).toMatch('No data');
    }
  });
});
