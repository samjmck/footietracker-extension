import { browser } from "webextension-polyfill-ts";
import { MessageType } from "./messaging";

// @ts-ignore
browser.runtime.onMessage.addListener(async message => {
    if(message === MessageType.GetAccessToken) {
        return window.localStorage['access-token'].slice(1, -1);
    }
});
