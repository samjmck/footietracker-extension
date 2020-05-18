import { browser, Cookies } from "webextension-polyfill-ts";
import { MessageType } from "../messaging";
import { Portfolio } from "../../../shared/backend/src/service/spreadsheets/interfaces";
import { getFullPortfolio } from "./full-portfolio";
import { getSimplifiedPortfolio } from "./simplified-portfolio";

async function getAccessToken(): Promise<string> {
    const cookie = await browser.cookies.get({ url: 'https://www.footballindex.co.uk', name: 'auth-token' });
    return cookie.value;
}

type SendPortfolioResponse = { error?: string | null };

async function sendPortfolio(portfolio: Portfolio, jwtCookie: Cookies.Cookie): Promise<SendPortfolioResponse> {
    return <SendPortfolioResponse> await (await fetch('https://api.footietracker.com/users/send_portfolio', {
        headers: {
            cookie: `jwt=${jwtCookie.value}`,
            'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ portfolio }),
    })).json();
}

export function addBackgroundListener(): void {
    let busyUpdating = false;
    let finishedUpdating = false;
    let errorMessage: string | null = null;

    // @ts-ignore
    browser.runtime.onMessage.addListener(async message => {
        switch(message) {
            case MessageType.UpdateSpreadsheetFull:
            case MessageType.UpdateSpreadsheetSimplified:
                busyUpdating = true;
                const accessToken = await getAccessToken();
                // const cookie = await browser.cookies.get({ url: 'https://footietracker.com', name: 'jwt' });

                let portfolio: Portfolio;
                if(message === MessageType.UpdateSpreadsheetFull) {
                    portfolio = await getFullPortfolio(accessToken);
                } else {
                    portfolio = await getSimplifiedPortfolio(accessToken);
                }

                console.log(portfolio);

                // const response = await sendPortfolio(portfolio, cookie);

                busyUpdating = false;
                finishedUpdating = true;
                // errorMessage = response.error !== undefined ? response.error : null;
                break;
            case MessageType.GetStatus:
                return [busyUpdating, finishedUpdating, errorMessage];
        }
    });
}
