import { ExchangeParams } from '@cloudamqp/amqp-client';
import { set } from './utils/set';

export type StandardExchangeType = 'direct' | 'fanout' | 'topic' | 'headers';

export type ExchangeType = StandardExchangeType | 'x-delayed-message';

interface KnownExchangeArguments {
    'alternate-exchange'?: string;
}

export type ExchangeArguments = Omit<Record<string, string | number>, keyof KnownExchangeArguments> &
    KnownExchangeArguments;

// Hide x-delayed-message from the public
export const Exchange = <T = unknown>(
    name: string,
    type: StandardExchangeType,
    params = {} as ExchangeParams,
    args = {} as ExchangeArguments
): ExchangeInterface<T> => InternalExchange<T>(name, type, params, args);

export const InternalExchange = <T = unknown>(
    name: string,
    type: ExchangeType,
    params = {} as ExchangeParams,
    args = {} as ExchangeArguments
): ExchangeInterface<T> => ({
    name,
    type,
    params,
    args,
    autoDelete: (autoDelete = true) => InternalExchange(name, type, { ...params, autoDelete }, args),
    durable: (durable = true) => InternalExchange(name, type, { ...params, durable }, args),
    passive: (passive = true) => InternalExchange(name, type, { ...params, passive }, args),
    alternateExchange: (alternate) =>
        InternalExchange(
            name,
            type,
            params,
            set(args, 'alternate-exchange', typeof alternate === 'string' ? alternate : alternate.name)
        ),
    delayed: () => InternalExchange(name, 'x-delayed-message', params, set(args, 'x-delayed-type', type))
});

export interface ExchangeInterface<T = unknown> {
    name: string;
    type: ExchangeType;
    params: ExchangeParams;
    args: ExchangeArguments;
    /**
     * Set the exchange as autoDelete.
     * AutoDelete exchanges will be deleted when there are no queues bound to it.
     */
    autoDelete(autoDelete?: boolean): this;
    /**
     * Set the exchange as durable. Durable exchanges will survive broker restarts.
     */
    durable(durable?: boolean): this;
    /**
     * Set the exchange as passive. Passive exchanges will not be created by the broker.
     */
    passive(passive?: boolean): this;
    /**
     * Set the alternate exchange for this exchange.
     * If a message cannot be routed to any queue
     * in this exchange, it will be sent to the alternate exchange.
     */
    alternateExchange(alternate: string | ExchangeInterface): this;
    /**
     * Set the exchange as delayed exchange
     */
    delayed(): this;
}
