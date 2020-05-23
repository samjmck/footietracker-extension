import * as moment from 'moment';
import 'moment/locale/en-gb';
import { getPlayerId } from "../../../shared/util/names";
import { ExpiringShare, Portfolio } from "../../../shared/backend/src/service/spreadsheets/interfaces";
import { getSimplifiedPortfolio } from "./simplified-portfolio";

enum TradeLabel {
    MarketBuy = 'Market Buy',
    SellQueue = 'Sell Queue',
    InstantSell = 'Instant Sell',
    MatchedInstantSell = 'Matched Instant Sell',
    Sale = 'Sale',
}

enum TradeType {
    Purchase = 'purchase',
    Sale = 'sale',
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

interface Trade {
    name: string;
    playerId: string;
    time: number;
    quantity: number;
    totalPrice: number;
    type: TradeType;
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
                playerId: tradeItem.code,
                time: moment(tradeItem.txDate).unix(),
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
    // Sort trades from new to old
    const trades = (await getTrades(accessToken)).sort((a, b) => b.time - a.time);

    const quantityByPlayerId: { [playerId: string]: number } = {};
    const checkedQuantityByPlayerId: { [playerId: string]: number } = {};
    const checkPlayerIds: string[] = [];
    const stopCheckingPlayerIds: string[] = [];

    const simplifiedPortfolio = await getSimplifiedPortfolio(accessToken);
    for(const { playerId, quantity } of simplifiedPortfolio.shares) {
        quantityByPlayerId[playerId] = quantity;
        checkedQuantityByPlayerId[playerId] = 0;
        checkPlayerIds.push(playerId);
    }

    const expiringShares: ExpiringShare[] = [];
    for(const trade of trades) {
        const { playerId } = trade;
        if(trade.type === TradeType.Sale || stopCheckingPlayerIds.indexOf(playerId) > -1 || checkPlayerIds.indexOf(playerId) === -1) {
            continue;
        }

        for(const shareSplit of shareSplits) {
            if(trade.time < shareSplit.time) {
                trade.quantity = trade.quantity * shareSplit.split;
            }
        }

        const quantity = checkedQuantityByPlayerId[playerId] + trade.quantity > quantityByPlayerId[playerId] ? quantityByPlayerId[playerId] - checkedQuantityByPlayerId[playerId] : trade.quantity;
        expiringShares.push({
            name: trade.name,
            quantity,
            totalPrice: Math.round((trade.totalPrice / trade.quantity) * quantity),
            buyTime: trade.time,
        });

        checkedQuantityByPlayerId[playerId] += trade.quantity;

        if(checkedQuantityByPlayerId[playerId] >= quantityByPlayerId[playerId]) {
            stopCheckingPlayerIds.push(trade.playerId);

            if(stopCheckingPlayerIds.length === checkPlayerIds.length) {
                break;
            }
        }
    }

    return {
        shares: simplifiedPortfolio.shares,
        expiringShares,
    };
}
