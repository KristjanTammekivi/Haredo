import { ExchangeParams } from '@cloudamqp/amqp-client';
import { set } from './utils/set';
import { ExchangeArguments, ExchangeInterface, ExchangeType, StandardExchangeType } from './types';

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
