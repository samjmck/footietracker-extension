import { browser } from "webextension-polyfill-ts";
import { MessageType } from "../messaging";
import { Portfolio } from "../interfaces";
import { getFullPortfolio } from "./full-portfolio";
import { getSimplifiedPortfolio } from "./simplified-portfolio";

async function getAccessToken(): Promise<string | null> {
    const cookie = await browser.cookies.get({ url: 'https://www.footballindex.co.uk', name: 'auth-token' });
    if(cookie === null) {
        return null;
    }
    return cookie.value;
}

async function getFootietrackerJWT(): Promise<string | null> {
    const cookie = await browser.cookies.get({ url: 'https://footietracker.com', name: 'jwt' });
    if(cookie === null) {
        return null;
    }
    return cookie.value;
}

async function sendPortfolio(portfolio: Portfolio, jwt: string): Promise<void> {
    await fetch('https://footietracker.com/api/users/send_portfolio', {
        headers: {
            cookie: `jwt=${jwt}`,
            'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ portfolio }),
    });
}

export function addBackgroundListener(): void {
    let busyUpdating = false;
    let finishedUpdating = false;
    let statusMessage: string = '';

    // @ts-ignore
    browser.runtime.onMessage.addListener(async message => {
        switch(message) {
            case MessageType.IsLoggedIntoFootballIndex:
                return (await getAccessToken()) !== null;
            case MessageType.IsLoggedIntoFootietracker:
                return (await getFootietrackerJWT()) !== null;
            case MessageType.UpdateSpreadsheetFull:
            case MessageType.UpdateSpreadsheetSimplified:
                busyUpdating = true;
                finishedUpdating = false;
                statusMessage = 'Updating spreadsheet...';

                const accessToken = await getAccessToken();
                if(accessToken === null) {
                    return;
                }

                const footietrackerJWT = await getFootietrackerJWT();
                if(footietrackerJWT === null) {
                    return;
                }

                let portfolio: Portfolio;
                if(message === MessageType.UpdateSpreadsheetFull) {
                    portfolio = await getFullPortfolio(accessToken);
                } else {
                    portfolio = await getSimplifiedPortfolio(accessToken);
                }

                await sendPortfolio(portfolio, footietrackerJWT);

                busyUpdating = false;
                finishedUpdating = true;
                statusMessage = 'Successfully updated spreadsheet.';
                break;
            case MessageType.GetStatus:
                return {
                    busyUpdating,
                    finishedUpdating,
                    statusMessage,
                };
        }
    });
}
