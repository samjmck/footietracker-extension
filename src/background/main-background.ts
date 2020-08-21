import { browser } from "webextension-polyfill-ts";
import { MessageType, Mode, apiDomainByMode } from "../messaging";
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

async function getFootietrackerJWT(url: string): Promise<string | null> {
    const cookie = await browser.cookies.get({ url: url, name: 'jwt' });
    if(cookie === null) {
        return null;
    }
    return cookie.value;
}

async function getFootietrackerDevJWT(): Promise<string | null> {
    return getFootietrackerJWT('https://dev.footietracker.com');
}

async function getFootietrackerStagingJWT(): Promise<string | null> {
    return getFootietrackerJWT('https://staging.footietracker.com');
}

async function getFootietrackerProdJWT(): Promise<string | null> {
    return getFootietrackerJWT('https://footietracker.com');
}

async function sendPortfolio(apiDomain: string, portfolio: Portfolio, jwt: string): Promise<void> {
    await fetch(`https://${apiDomain}/users/send_portfolio`, {
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
    let mode: Mode = Mode.Prod;

    // @ts-ignore
    browser.runtime.onMessage.addListener(async message => {
        switch(message) {
            case MessageType.IsLoggedIntoFootballIndex:
                return (await getAccessToken()) !== null;
            case MessageType.IsLoggedIntoFootietracker:
                const promises = [getFootietrackerDevJWT(), getFootietrackerStagingJWT(), getFootietrackerProdJWT()];
                const results = await Promise.all(promises);
                let loggedIn = false;
                const canChangeMode = results[0] !== null || results[1] !== null;
                for(const result of results) {
                    if(result !== null) {
                        loggedIn = true;
                        break;
                    }
                }
                return [loggedIn, canChangeMode];
            case MessageType.ChangeMode:
                switch(mode) {
                    case Mode.Dev:
                        mode = Mode.Staging;
                        break;
                    case Mode.Staging:
                        mode = Mode.Prod;
                        break;
                    case Mode.Prod:
                        mode = Mode.Dev;
                        break;
                }
                break;
            case MessageType.GetMode:
                return mode;
            case MessageType.UpdateSpreadsheetFull:
            case MessageType.UpdateSpreadsheetSimplified:
                busyUpdating = true;
                finishedUpdating = false;
                statusMessage = 'Updating spreadsheet...';

                const accessToken = await getAccessToken();
                if(accessToken === null) {
                    return;
                }

                let footietrackerJWT: string | null;
                switch(mode) {
                    case Mode.Dev:
                        footietrackerJWT = await getFootietrackerDevJWT();
                        break;
                    case Mode.Staging:
                        footietrackerJWT = await getFootietrackerStagingJWT();
                        break;
                    case Mode.Prod:
                        footietrackerJWT = await getFootietrackerProdJWT();
                        break;
                }
                if(footietrackerJWT === null) {
                    console.log('Not logged into Footietracker');
                    return;
                }

                let portfolio: Portfolio;
                if(message === MessageType.UpdateSpreadsheetFull) {
                    portfolio = await getFullPortfolio(accessToken);
                } else {
                    portfolio = await getSimplifiedPortfolio(accessToken);
                }

                await sendPortfolio(apiDomainByMode[mode], portfolio, footietrackerJWT);

                busyUpdating = false;
                finishedUpdating = true;
                statusMessage = 'Successfully updated spreadsheet.';
                break;
            case MessageType.GetStatus:
                return {
                    busyUpdating,
                    finishedUpdating,
                    statusMessage,
                    mode,
                };
        }
    });
}
