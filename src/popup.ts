import { browser } from "webextension-polyfill-ts";
import { MessageType } from "./messaging";

const exportSpreadsheetSimplifiedButton = document.getElementById('update-spreadsheet-simplified');
const exportSpreadsheetFullButton = document.getElementById('update-spreadsheet-full');
const statusElement = document.getElementById('status');

if(exportSpreadsheetFullButton !== null && exportSpreadsheetSimplifiedButton !== null && statusElement !== null) {
    const setStatus = async () => {
        const response = await browser.runtime.sendMessage(MessageType.GetStatus);
        if(!response[0] && response[1]) {
            statusElement.innerText = response[2] !== null ? 'Updated spreadsheet.' : response[2];
        } else if(response[0]) {
            statusElement.innerText = 'Updating spreadsheet...';
        }
    };

    setStatus();

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
