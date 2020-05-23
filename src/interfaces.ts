export interface Portfolio {
    shares: Share[];
    expiringShares: ExpiringShare[];
}

export interface Share {
    name: string;
    playerId: string;
    quantity: number;
    totalPrice: number;
}

export interface ExpiringShare {
    name: string;
    quantity: number;
    totalPrice: number;
    buyTime: number;
}
