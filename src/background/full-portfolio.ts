import * as moment from 'moment';
import 'moment/locale/en-gb';
import { getSimplifiedPortfolio } from "./simplified-portfolio";
import {
    Dividend,
    ExpiringShare,
    Portfolio,
    Trade,
    TradeLabel,
    TradeType,
    DividendType
} from "../interfaces";

interface DividendTransaction {
    id: number;
    userId: number;
    total: number;
    qty: number;
    type: string;
    name: string;
    balance: number;
    transactiondate: number | string;
    subtype: RawDividendType;
    dividendsId: number;
}

enum RawDividendType {
    InPlayCleanSheet = 'DIVIDENDS_IN_PLAY_CLEAN_SHEET',
    InPlayGoal = 'DIVIDENDS_IN_PLAY_GOAL',
    InPlayAssist = 'DIVIDENDS_IN_PLAY_ASSIST',
    Media = 'DIVIDENDS_MEDIA',
    MatchDay = 'DIVIDENDS_PLAYER_STATS',
}
const rawDividendTypes = Object.values(RawDividendType);

export function rawDividendTypeToDividendType(rawDividendType: RawDividendType): DividendType {
    switch(rawDividendType) {
        case RawDividendType.InPlayCleanSheet:
            return DividendType.InPlayCleanSheet;
        case RawDividendType.InPlayGoal:
            return DividendType.InPlayGoal;
        case RawDividendType.InPlayAssist:
            return DividendType.InPlayAssist;
        case RawDividendType.Media:
            return DividendType.Media;
        case RawDividendType.MatchDay:
            return DividendType.MatchDay;
    }
}


interface TradeTransaction {
    id: number;
    userId: number;
    total: number;
    qty: number;
    type: 'SALE' | 'PURCHASE';
    name: string;
    balance: number;
    transactiondate: number | string;
    tradeId: number;
}

function isDividendTransaction(transaction: any): transaction is DividendTransaction {
    return transaction.dividendsId !== undefined;
}

function isTradeTransaction(transaction: any): transaction is TradeTransaction {
    return transaction.tradeId !== undefined && (transaction.type === 'SALE' || transaction.type === 'PURCHASE');
}

type Transaction = DividendTransaction | TradeTransaction;

interface TransactionsResponse {
    count: number;
    items: Transaction[];
    page: number;
    per_page: number;
    total: number;
}

interface TradeResponse {
    count: number;
    items: TradeItem[];
    page: number;
    per_page: number;
    total: number;
}

interface TradeItem {
    id: number;
    celebrityId: number;
    userId: number;
    sharePrice: number;
    shareQty: number;
    total: number;
    status: string;
    type: TradeType;
    orderType: string;
    meta?: any;
    txDate: string;
    createdAt: string;
    isPartialFill: boolean;
    exchangeOrderUuid?: any;
    label: TradeLabel;
    updatedAt: string;
    code: string;
    thumbnailImage: string;
    profileImage: string;
    price: number;
    name: string;
}

async function getTransactions(accessToken: string): Promise<[Trade[], Dividend[]]> {
    const trades: Trade[] = [];
    const dividends: Dividend[] = [];

    let noTradesLeft = false;
    let page = 1;
    while(!noTradesLeft) {
        const transactionsResponse = <TransactionsResponse> await (await fetch(`https://api-prod.footballindex.co.uk/transactions?page=${page++}&per_page=1000`, {
            headers: {
                'x-access-token': accessToken,
                'x-client-type': 'responsive-tablet',
                'Referer': 'https://www.footballindex.co.uk/account/trades',
                'Accept': 'application/json, text/plain, */*',
            },
        })).json();

        if(transactionsResponse.items.length === 0) {
            noTradesLeft = true;
            break;
        }

        for(const transaction of transactionsResponse.items) {
            if(isDividendTransaction(transaction)) {
                dividends.push({
                    name: transaction.name,
                    time: moment(transaction.transactiondate).valueOf(),
                    quantity: transaction.qty,
                    total: transaction.total,
                    type: rawDividendTypeToDividendType(transaction.subtype),
                });
            } else if(isTradeTransaction(transaction)) {
                trades.push({
                    name: transaction.name,
                    time: moment(transaction.transactiondate).valueOf(),
                    quantity: transaction.qty,
                    totalPrice: transaction.total,
                    type: transaction.type === 'SALE' ? TradeType.Sale : TradeType.Purchase,
                })
            } else {
                continue;
            }
            transaction.transactiondate = moment(transaction.transactiondate).valueOf();
        }
    }

    console.log(dividends);

    return [trades, dividends];
}

async function getTrades(accessToken: string): Promise<Trade[]> {
    const trades: Trade[] = [];

    let noTradesLeft = false;
    let page = 1;
    while(!noTradesLeft) {
        const tradeResponse = <TradeResponse> await (await fetch(`https://api-prod.footballindex.co.uk/trades?page=${page++}&per_page=1000`, {
            headers: {
                'x-access-token': accessToken,
                'x-client-type': 'responsive-tablet',
                'Referer': 'https://www.footballindex.co.uk/account/trades',
                'Accept': 'application/json, text/plain, */*',
            },
        })).json();

        if(tradeResponse.items.length === 0) {
            noTradesLeft = true;
            break;
        }

        for(const tradeItem of tradeResponse.items) {
            trades.push({
                name: tradeItem.name,
                // playerId: tradeItem.code,
                time: moment(tradeItem.txDate).valueOf(),
                type: tradeItem.type,
                totalPrice: Math.round(tradeItem.total * 100),
                quantity: tradeItem.shareQty,
            });
        }
    }

    return trades;
}

const shareSplits: { time: number, split: number }[] = [
    {
        time: 1553558400, // 26 March 2019
        split: 3,
    },
];

export async function getFullPortfolio(accessToken: string): Promise<Portfolio> {
    // Sort from new to old
    let [trades, dividends] = await getTransactions(accessToken);
    trades = trades.sort((a, b) => b.time - a.time);
    // dividends = dividends.sort((a, b) => b.time - a.time);

    const quantityByPlayer: { [playerName: string]: number } = {};
    const checkedQuantityByPlayer: { [playerName: string]: number } = {};
    const checkPlayers: string[] = [];
    const stopCheckingPlayers: string[] = [];

    const simplifiedPortfolio = await getSimplifiedPortfolio(accessToken);
    for(const { name, quantity } of simplifiedPortfolio.shares) {
        quantityByPlayer[name] = quantity;
        checkedQuantityByPlayer[name] = 0;
        checkPlayers.push(name);
    }

    dividends = dividends.filter(dividend => checkPlayers.indexOf(dividend.name) > 0).sort((a, b) => b.time - a.time);

    const expiringShares: ExpiringShare[] = [];
    for(const trade of trades) {
        const { name } = trade;
        if(trade.type === TradeType.Sale || stopCheckingPlayers.indexOf(name) > -1 || checkPlayers.indexOf(name) === -1) {
            continue;
        }

        for(const shareSplit of shareSplits) {
            if(trade.time < shareSplit.time) {
                trade.quantity = trade.quantity * shareSplit.split;
            }
        }

        const quantity = checkedQuantityByPlayer[name] + trade.quantity > quantityByPlayer[name] ? quantityByPlayer[name] - checkedQuantityByPlayer[name] : trade.quantity;
        expiringShares.push({
            name: trade.name,
            quantity,
            totalPrice: Math.round((trade.totalPrice / trade.quantity) * quantity),
            buyTime: trade.time,
        });

        checkedQuantityByPlayer[name] += trade.quantity;

        if(checkedQuantityByPlayer[name] >= quantityByPlayer[name]) {
            stopCheckingPlayers.push(trade.name);

            if(stopCheckingPlayers.length === checkPlayers.length) {
                break;
            }
        }
    }

    return {
        shares: simplifiedPortfolio.shares,
        expiringShares,
        dividends,
    };
}
