// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-sabarivka-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      include: [
        // Specify include pattern(s) first
        'src/**/*.(ts|js)',
        // Then specify "do not touch" patterns (note `!` sign on the beginning of each statement)
        '!src/main.(ts|js)',
        '!src/**/*.spec.(ts|js)',
        '!src/**/*.module.(ts|js)',
        '!src/**/environment*.(ts|js)',
      ],
      reporters: [
        // { type: 'html', dir: 'coverage/' },
        { type: 'lcov' },
      ],
    },
    reporters: ['sabarivka', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true,
    failOnEmptyTestSuite: false,
  });
};
