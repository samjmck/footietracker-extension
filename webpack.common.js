const webpack = require('webpack');
const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    getCommonOptions: (backgroundFilePath, distDirectoryPath) => ({
        mode: 'production',
        entry: {
            popup: `${__dirname}/src/popup.ts`,
            background: backgroundFilePath,
        },
        devtool: 'source-map',
        output: {
            filename: '[name].js',
            path: distDirectoryPath,
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)$/,
                    include: [
                        `${__dirname}/src`,
                        path.resolve(__dirname, '../shared'),
                    ],
                    use: ['ts-loader'],
                }
            ]
        },
        plugins: [
            new CleanWebpackPlugin(distDirectoryPath, { exclude: ['popup.html', 'manifest.json'] }),
            // So we don't load all the locale files into the bundle
            // Significantly reduces the bundle size
            new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
            new CopyWebpackPlugin([
                {
                    from: `${__dirname}/src/popup.html`,
                    to: distDirectoryPath,
                },
                {
                    from: `${__dirname}/node_modules/webextension-polyfill/dist/browser-polyfill.js`,
                    to: distDirectoryPath,
                },
                {
                    from: `${__dirname}/icons`,
                    to: `${distDirectoryPath}/icons`,
                }
            ]),
        ],
    }),
};
