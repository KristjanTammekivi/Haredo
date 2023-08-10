export type StandardExchangeType = 'direct' | 'fanout' | 'topic' | 'headers';

export type ExchangeType = StandardExchangeType | 'x-delayed-message';

export const Exchange = <T = unknown>(name: string, type: ExchangeType, options?: any): ExchangeInterface<T> => ({
    name,
    type
});

export interface ExchangeInterface<T = unknown> {
    name: string;
    type: ExchangeType;
}
