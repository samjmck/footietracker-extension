const { getCommonOptions } = require('./webpack.common');

const backgroundFilePath = `${__dirname}/src/background/browser/standard-webextension-background.ts`;
const distDirectoryPath = `${__dirname}/dist-standard-webextension`;

module.exports = getCommonOptions(backgroundFilePath, distDirectoryPath);
