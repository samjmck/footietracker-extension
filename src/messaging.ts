export enum MessageType {
    UpdateSpreadsheetFull,
    UpdateSpreadsheetSimplified,
    GetStatus,
    GetAccessToken,
    IsLoggedIntoFootballIndex,
    IsLoggedIntoFootietracker,
    ChangeMode,
    GetMode,
}

export enum Mode {
    Dev = 'dev',
    Staging = 'staging',
    Prod = 'prod',
}

export const apiDomainByMode: {[mode: string]: string} = {
    [Mode.Dev]: 'dev.api.footietracker.com',
    [Mode.Staging]: 'staging.api.footietracker.com',
    [Mode.Prod]: 'api.footietracker.com',
}

export const modes = [Mode.Dev, Mode.Staging, Mode.Prod];