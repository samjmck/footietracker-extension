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
    [Mode.Dev]: 'dev.footietracker.com/dev-api',
    [Mode.Staging]: 'staging.footietracker.com/staging-api',
    [Mode.Prod]: 'footietracker.com/api',
}

export const modes = [Mode.Dev, Mode.Staging, Mode.Prod];