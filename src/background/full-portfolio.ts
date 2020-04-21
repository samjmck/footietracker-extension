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

interface TransactionHistoryItem {
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

async function getTransactionHistory(accessToken: string, page: number, perPage: number): Promise<{ items: TransactionHistoryItem[]; loopedThrough: number; total: number; stockSplitAfterIndex?: number; }> {
    const data = <TransactionsResponse> await (await fetch(`https://api-prod.footballindex.co.uk/transactions?page=${page}&per_page=${perPage}`, {
        headers: {
            'x-access-token': accessToken, // slice to remove quotation marks
            'x-client-type': 'responsive-tablet',
            'Referer': 'https://www.footballindex.co.uk/stockmarket/account/transactions',
            'Accept': 'application/json, text/plain, */*',
        },
    })).json();

    let loopedThrough = 0;
    let stockSplitAfterIndex: number | undefined;
    const items: TransactionHistoryItem[] = [];
    for(const item of data.items) {
        loopedThrough++;
        if(item.type === 'PURCHASE' || item.type === 'SALE') {
            items.push({
                type: item.type === 'PURCHASE' ? TransactionType.Buy : TransactionType.Sell,
                playerId: getPlayerId(item.name),
                quantity: item.qty,
                totalPrice: item.total,
                time: moment.utc(item.transactiondate, 'YYYY-MM-DDTHH:mm:ss.SSSSZ').valueOf(),
                name: item.name,
                rawType: item.type,
            });
        } else if(item.type === 'STOCK_SPLIT') {
            stockSplitAfterIndex = items.length - 1;
        }
    }

    return {
        items,
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
    const playerIds: string[] = [];
    for(const share of portfolio.shares) {
        playerIds.push(share.playerId);
        quantities[share.playerId] = share.quantity;
    }

    let quantityMultiplier = 1;
    let page = 1;
    let stopCheckingPlayerIds: string[] = [];
    while(stopCheckingPlayerIds.length < playerIds.length) {
        const { items, stockSplitAfterIndex } = await getTransactionHistory(accessToken, page++, 200);
        let index = 0;
        for(const item of items) {
            const { playerId } = item;

            if(stockSplitAfterIndex !== undefined && index > stockSplitAfterIndex) {
                quantityMultiplier = 3;
            }
            index++;

            if(playerIds.indexOf(playerId) === -1 || stopCheckingPlayerIds.indexOf(playerId) > -1) {
                continue;
            }

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

                if(expiringQuantities[playerId] >= quantities[playerId]) {
                    expiringSharesByPlayerId[playerId][expiringSharesByPlayerId[playerId].length - 1].quantity = quantities[playerId] % 300;
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
