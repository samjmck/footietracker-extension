import { browser } from "webextension-polyfill-ts";
import { addBackgroundListener } from "../main-background";

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if(tab.url) {
        if(
            tab.url.indexOf('https://www.footballindex.co.uk') === 0 ||
            tab.url.indexOf('https://footballindex.co.uk') === 0
        ) {
            browser.pageAction.show(tabId);
        }
    }
});

addBackgroundListener();
