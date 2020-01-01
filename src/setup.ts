import { Queue } from './queue';
import { ConnectionManager } from './connection-manager';
import { StateExchangeCollection } from './state';
import { promiseMap } from './utils';
import { makeLogger } from './logger';

const { debug } = makeLogger('Setup:');

export const setup = async (
    connectionManager: ConnectionManager,
    queue: Queue,
    exchangeCollection: StateExchangeCollection[]
) => {
    if (queue) {
        debug(`Asserting ${queue}`);
        await connectionManager.assertQueue(queue);
        debug(`Done asserting ${queue}`);
    }
    await promiseMap(exchangeCollection, async (exchangery) => {
        debug(`Asserting ${exchangery.exchange}`);
        await connectionManager.assertExchange(exchangery.exchange);
        if (queue) {
            await promiseMap(exchangery.patterns, async (pattern) => {
                debug(`Binding ${queue} to ${exchangery.exchange} using pattern ${pattern}`);
                await connectionManager.bindQueue(exchangery.exchange, queue, pattern);
            });
        }
        debug(`Done asserting ${exchangery.exchange}`);
    });
};
