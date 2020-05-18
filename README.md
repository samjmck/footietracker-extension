# Footietracker portfolio updater

## Build yourself

This extension uses webpack to package the JS files so I can use the moment package and have a better developer experience. This package also uses the TypeScript wrapped version of [browser-polyfill](https://github.com/Lusito/webextension-polyfill-ts) by Mozilla to be compatible with as many browsers as possible.

To build the extension yourself, do the following:

1. If you don't have the source code, clone the repository by running `git clone https://github.com/samjmckenzie/footietracker-extension.git` and change directory to the source code folder
2. Install npm modules by entering the following: `npm install`
3. For Firefox, run `webpack --config webpack.standard-webextension.js`. The build will be in the `dist-standard-webextension` directory. For Chrome or Edge, run `webpack --config webpack.chrome.js`. The build will be in the `dist-chrome` directory.

## How does it work?

The extension will loop through all the transaction history pages in your [FootballIndex account settings](https://www.footballindex.co.uk/stockmarket/account/transactions). It will do so in the reverse order that is used on the FootballIndex website, so the portfolio data is automatically sorted chronologically. While looping through the transactions, it will skip transactions that are not purchase or sell transactions, such as dividends or commission being taken from a transaction. Purchase and sell transactions will be added to the data payload that will ultimately be sent to your Footietracker account. The data payload will be structured as follows:

```ts
interface Portfolio {
    shares: {
        name: string;
        playerId: string;
        quantity: number;
        totalPrice: number;
    }[];
    expiringShares: {
        name: string;
        quantity: number;
        buyTime: number;
    }[];
}
```

Apart from the portfolio data payload, no data is sent to Footietracker servers. It is important to note that the JWT belonging to the current FootballIndex browser session will only be used for the transaction history requests and will never be sent to servers that don't belong to FootballIndex. 
