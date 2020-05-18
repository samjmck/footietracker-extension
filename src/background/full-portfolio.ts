import * as moment from 'moment';
import 'moment/locale/en-gb';
import { getPlayerId } from "../../../shared/util/names";
import { ExpiringShare, Portfolio } from "../../../shared/backend/src/service/spreadsheets/interfaces";
import { getSimplifiedPortfolio } from "./simplified-portfolio";

enum TransactionType {
    Sell,
    Buy,
}

export type RawTransactionType =
    'SALE' |
    'COMMISSION' |
    'Media Dividends' |
    'Match Day Dividends' |
    'PURCHASE' |
    'Unsold' |
    'In-Play Dividends' |
    'CLOSED_ORDER_CANCELLED' |
    'STOCK_SPLIT';

interface TransactionItem {
    type: TransactionType;
    rawType: RawTransactionType;
    playerId: string;
    name: string;
    quantity: number;
    totalPrice: number;
    time: number;
}

interface TransactionsResponse {
    count: number;
    items: {
        balance: number;
        id: number;
        tradeId: number;
        userId: number;
        name: string;
        total: number;
        qty: number;
        type: RawTransactionType;
        transactiondate: string;
    }[];
    page: number;
    per_page: number;
    total: number;
}

// Gets the transactions of a certain page of your transaction history and converts
// the details of those transactions to a more readable format
// Keep in mind the transactions and pages are listed from newest to oldest
async function getTransactionHistory(accessToken: string, page: number, perPage: number): Promise<{
    items: TransactionItem[];
    loopedThrough: number;
    total: number;
    stockSplitAfterIndex?: number;
}> {
    // console.log(`Loading ${perPage} entries on page ${page}`);
    const data = <TransactionsResponse> await (await fetch(`https://api-prod.footballindex.co.uk/transactions?page=${page}&per_page=${perPage}`, {
        headers: {
            'x-access-token': accessToken,
            'x-client-type': 'responsive-tablet',
            'Referer': 'https://www.footballindex.co.uk/stockmarket/account/transactions',
            'Accept': 'application/json, text/plain, */*',
        },
    })).json();

    let loopedThrough = 0;
    let stockSplitAfterIndex: number | undefined;
    const transactionItems: TransactionItem[] = [];
    for(const item of data.items) {
        switch(item.type) {
            case 'PURCHASE':
            case 'SALE':
                const transactionItem: TransactionItem = {
                    type: item.type === 'PURCHASE' ? TransactionType.Buy : TransactionType.Sell,
                    playerId: getPlayerId(item.name),
                    quantity: item.qty,
                    totalPrice: item.total,
                    time: moment.utc(item.transactiondate, 'YYYY-MM-DDTHH:mm:ss.SSSSZ').valueOf(),
                    name: item.name,
                    rawType: item.type,
                };
                transactionItems.push(transactionItem);
                // console.log(`[${loopedThrough}] Adding transaction with type ${item.type}`);
                // console.log(transactionItem);
                break;
            case 'STOCK_SPLIT':
                // console.log(`[${loopedThrough}] Found stock split`);
                stockSplitAfterIndex = transactionItems.length;
                break;
            default:
                // console.log(`[${loopedThrough}] Unknown item type "${item.type}"`);
        }
        // console.log(item);
        loopedThrough++;
    }

    // console.log('\n\n');

    return {
        items: transactionItems,
        loopedThrough,
        stockSplitAfterIndex,
        total: data.total,
    };
}

export async function getFullPortfolio(accessToken: string): Promise<Portfolio> {
    const expiringSharesByPlayerId: { [playerId: string]: ExpiringShare[] } = {};
    const expiringQuantities: { [playerId: string]: number } = {};

    const portfolio = await getSimplifiedPortfolio(accessToken);

    const quantities: { [playerId: string]: number } = {};
    const portfolioCurrentPlayerIds: string[] = [];
    for(const share of portfolio.shares) {
        portfolioCurrentPlayerIds.push(share.playerId);
        quantities[share.playerId] = share.quantity;
        // console.log(`Quantity ${share.quantity} for ${share.playerId}`)
    }

    let quantityMultiplier = 1;
    let page = 1;
    let stopCheckingPlayerIds: string[] = [];
    while(stopCheckingPlayerIds.length < portfolioCurrentPlayerIds.length) {
        const { items, stockSplitAfterIndex } = await getTransactionHistory(accessToken, page++, 200);
        let index = 0;
        for(const item of items) {
            const { playerId } = item;

            if(stockSplitAfterIndex !== undefined && index > stockSplitAfterIndex) {
                quantityMultiplier = 3;
            }
            index++;


            if(
                // This player is currently not in the portfolio
                portfolioCurrentPlayerIds.indexOf(playerId) === -1 ||
                // or this player has already been fully checked
                stopCheckingPlayerIds.indexOf(playerId) > -1
            ) {
                continue;
            }

            // Initialise expiring variables for this playerId
            if(expiringSharesByPlayerId[playerId] === undefined) {
                expiringSharesByPlayerId[playerId] = [];
                expiringQuantities[playerId] = 0;
            }

            if(item.type === TransactionType.Buy) {
                expiringSharesByPlayerId[playerId].push({
                    name: item.name,
                    quantity: item.quantity * quantityMultiplier,
                    totalPrice: item.totalPrice * 100,
                    buyTime: item.time,
                });
                expiringQuantities[playerId] += item.quantity * quantityMultiplier;
                // console.log(`Expiring quantities for ${playerId} is at ${expiringQuantities[playerId]}`);

                if(expiringQuantities[playerId] > quantities[playerId]) {
                    if(expiringSharesByPlayerId[playerId].length > 1) {
                        expiringSharesByPlayerId[playerId][expiringSharesByPlayerId[playerId].length - 1].quantity = quantities[playerId] - expiringSharesByPlayerId[playerId].slice(0, -1).reduce((quantity, currentShare) => quantity + currentShare.quantity, 0);
                    } else {
                        expiringSharesByPlayerId[playerId][expiringSharesByPlayerId[playerId].length - 1].quantity = quantities[playerId];
                    }
                    stopCheckingPlayerIds.push(playerId);
                } else if(expiringQuantities[playerId] === quantities[playerId]) {
                    stopCheckingPlayerIds.push(playerId);
                }
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    for(const playerId in expiringSharesByPlayerId) {
        portfolio.expiringShares.push(...expiringSharesByPlayerId[playerId]);
    }

    return portfolio;
}
