const { glob } = require('glob');

const fs = require('fs');
const path = require('path');

const getLcovFiles = function (src) {
  return new Promise((resolve) => {
    glob(`${src}/**/lcov.info`, (error, result) => {
      console.log(result);

      if (error) resolve([]);
      resolve(result);
    });
  });
};

(async function () {
  console.log('Merging lcov files...');
  try {
    const files = await getLcovFiles('./coverage');

    console.log(files);

    const mergedReport = files.reduce(
      (mergedReport, currFile) => (mergedReport += fs.readFileSync(currFile)),
      '',
    );

    await fs.writeFile(path.resolve('./coverage/lcov.info'), mergedReport, (err) => {
      if (err) throw err;
      console.log('The file has been saved!');
    });
  } catch (error) {
    console.error(error);
  }
})();
