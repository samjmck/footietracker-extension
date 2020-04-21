# Footietracker portfolio updater

## Build yourself

To build the extension yourself, do the following:

1. Clone the repository by running `git clone https://github.com/samjmckenzie/Footietracker-portfolio-updater.git`
2. Change directory to the clone by running `cd Footietracker-portfolio-updater`
3. Install npm modules by entering the following: `npm install`
4. For Chrome, run `webpack --config webpack.chrome.js`. The build will be in the `dist-chrome` directory. For Edge or Firefox, run `webpack --config webpack.standard-webextension.js`. The build will be in the `dist-standard-webextension` directory.

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
