const yaml = require('js-yaml');

module.exports.readVersion = function (contents) {
  let chart;
  try {
    chart = yaml.load(contents, 'utf-8');
  } catch (e) {
    console.error(e);
    throw e;
  }
  return chart.version;
};

module.exports.writeVersion = function (contents, version) {
  let chart = yaml.load(contents, 'utf8');
  chart.version = version;
  chart.appVersion = version;
  return yaml.dump(chart, { indent: 2 });
};