import { Portfolio } from "../../../shared/backend/src/service/spreadsheets/interfaces";

interface SummaryResponse {
    totals: {
        [playerId: string]: {
            name: string;
            id: string;
            price: number;
            sellvalue: number;
            sellqty: number;
            qty: number;
        }
    }
}

// This function returns a Portfolio object that will have an empty array as its expiredShares field
// The reason for this is because this function use the same data source as the "portfolio" page on
// FootballIndex which does not include any purchase dates, so it is not possible to calculate when
// shares expire.
// The getFullPortfolio function will go through the transaction history of the account where more
// data can be used. However, its shares field will be identical to the shares field of this
// function's result.
export async function getSimplifiedPortfolio(accessToken: string): Promise<Portfolio> {
    const summaryData = <SummaryResponse> await (await fetch(`https://api-prod.footballindex.co.uk/portfolio/summury?history=false`, {
        headers: {
            'x-access-token': accessToken, // slice to remove quotation marks
            'x-client-type': 'responsive-tablet',
            'Referer': 'https://www.footballindex.co.uk/stockmarket/portfolio',
            'Accept': 'application/json, text/plain, */*',
        },
    })).json();

    const portfolio: Portfolio = {
        shares: [],
        expiringShares: [],
    };

    for(const key in summaryData.totals) {
        const item = summaryData.totals[key];
        portfolio.shares.push({
            name: item.name,
            playerId: item.id,
            quantity: item.qty + item.sellqty,
            // TODO: double check
            // is item.sellvalue the value of the shares at this moment or the price the
            // user paid for them?
            totalPrice: item.price * 100 * item.qty + item.sellvalue * 100 * item.sellqty,
        });
    }

    return portfolio;
}
