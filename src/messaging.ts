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
    [Mode.Dev]: 'dev.footietracker.com/api/v1',
    [Mode.Staging]: 'staging.footietracker.com/api/v1',
    [Mode.Prod]: 'footietracker.com/api/v1',
}

export const modes = [Mode.Dev, Mode.Staging, Mode.Prod];