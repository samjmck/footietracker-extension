import { browser } from "webextension-polyfill-ts";
import { MessageType } from "./messaging";

const loggedInElement = document.getElementById('logged-in');
const loginFootballIndexElement = document.getElementById('login-footballindex');
const loginFootietrackerElement = document.getElementById('login-footietracker');

const exportSpreadsheetSimplifiedButton = document.getElementById('update-spreadsheet-simplified');
const exportSpreadsheetFullButton = document.getElementById('update-spreadsheet-full');
const statusElement = document.getElementById('status');

(async () => {
    if(
        loggedInElement !== null &&
        loginFootballIndexElement !== null &&
        loginFootietrackerElement !== null &&
        exportSpreadsheetFullButton !== null &&
        exportSpreadsheetSimplifiedButton !== null &&
        statusElement !== null
    ) {
        const setStatus = async () => {
            const { busyUpdating, finishedUpdating, statusMessage } = await browser.runtime.sendMessage(MessageType.GetStatus);
            if (busyUpdating && !finishedUpdating) {
                statusElement.innerText = statusMessage;
            } else if (!busyUpdating && finishedUpdating) {
                statusElement.innerText = statusMessage;
            } else {
                statusElement.innerText = '';
            }
        };

        const isLoggedIntoFootballIndex = await browser.runtime.sendMessage(MessageType.IsLoggedIntoFootballIndex);
        const isLoggedIntoFootietracker = await browser.runtime.sendMessage(MessageType.IsLoggedIntoFootietracker);

        if(isLoggedIntoFootballIndex) {
            loginFootballIndexElement.style.display = 'none';
        }
        if(isLoggedIntoFootietracker) {
            loginFootietrackerElement.style.display = 'none';
        }
        if(isLoggedIntoFootballIndex && isLoggedIntoFootietracker) {
            loggedInElement.style.display = 'block';
        }

        setStatus();

        exportSpreadsheetSimplifiedButton.addEventListener('click', async event => {
            console.log('Updating spreadsheet simplified button clicked');
            statusElement.innerText = 'Updating spreadsheet...';

            await browser.runtime.sendMessage(MessageType.UpdateSpreadsheetSimplified);

            await setStatus();
        });

        exportSpreadsheetFullButton.addEventListener('click', async event => {
            console.log('Updating spreadsheet full button clicked');
            statusElement.innerText = 'Updating spreadsheet...';

            await browser.runtime.sendMessage(MessageType.UpdateSpreadsheetFull);

            await setStatus();
        });
    }
})();
