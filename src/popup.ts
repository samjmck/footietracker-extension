import { browser } from "webextension-polyfill-ts";
import { MessageType } from "./messaging";

const loggedInElement = document.getElementById('logged-in');
const loginFootballIndexElement = document.getElementById('login-footballindex');
const loginFootietrackerElement = document.getElementById('login-footietracker');
const modeElement = document.getElementById('mode');

const exportSpreadsheetSimplifiedButton = document.getElementById('update-spreadsheet-simplified');
const exportSpreadsheetFullButton = document.getElementById('update-spreadsheet-full');
const changeModeButton = document.getElementById('change-mode');

const statusElement = document.getElementById('status');

(async () => {
    if(
        loggedInElement !== null &&
        loginFootballIndexElement !== null &&
        loginFootietrackerElement !== null &&
        exportSpreadsheetFullButton !== null &&
        exportSpreadsheetSimplifiedButton !== null &&
        statusElement !== null &&
        modeElement !== null &&
        changeModeButton !== null
    ) {
        const setStatus = async () => {
            const message = await browser.runtime.sendMessage(MessageType.GetStatus);
            const { busyUpdating, finishedUpdating, statusMessage, mode } = message;
            if (busyUpdating && !finishedUpdating) {
                statusElement.innerText = statusMessage;
            } else if (!busyUpdating && finishedUpdating) {
                statusElement.innerText = statusMessage;
            } else {
                statusElement.innerText = '';
            }
            modeElement.innerText = mode;
        };

        const isLoggedIntoFootballIndex = await browser.runtime.sendMessage(MessageType.IsLoggedIntoFootballIndex);
        const [isLoggedIntoFootietracker, canChangeMode] = await browser.runtime.sendMessage(MessageType.IsLoggedIntoFootietracker);

        if(isLoggedIntoFootballIndex) {
            loginFootballIndexElement.style.display = 'none';
        }
        if(isLoggedIntoFootietracker) {
            loginFootietrackerElement.style.display = 'none';
        }
        if(isLoggedIntoFootballIndex && isLoggedIntoFootietracker) {
            loggedInElement.style.display = 'block';
            if(canChangeMode) {
                modeElement.style.display = 'block';
                changeModeButton.style.display = 'block';
            }
        }

        setStatus();

        changeModeButton.addEventListener('click', async event => {
            await browser.runtime.sendMessage(MessageType.ChangeMode);
            const mode = await browser.runtime.sendMessage(MessageType.GetMode);
            modeElement.innerText = mode;
        });

        exportSpreadsheetSimplifiedButton.addEventListener('click', async event => {
            statusElement.innerText = 'Updating spreadsheet...';

            await browser.runtime.sendMessage(MessageType.UpdateSpreadsheetSimplified);

            await setStatus();
        });

        exportSpreadsheetFullButton.addEventListener('click', async event => {
            statusElement.innerText = 'Updating spreadsheet...';

            await browser.runtime.sendMessage(MessageType.UpdateSpreadsheetFull);

            await setStatus();
        });
    }
})();
