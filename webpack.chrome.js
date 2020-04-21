const { getCommonOptions } = require('./webpack.common');

const backgroundFilePath = `${__dirname}/src/background/browser/chrome-background.ts`;
const distDirectoryPath = `${__dirname}/dist-chrome`;

module.exports = getCommonOptions(backgroundFilePath, distDirectoryPath);
