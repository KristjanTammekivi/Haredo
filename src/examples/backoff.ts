import { haredo } from '../haredo';
import { q } from '../index';
import { standardBackoff } from '../backoffs';

const main = async () => {
    const chain = haredo({
        connection: 'amqp://guest:guest@localhost:5672/'
    });
    const queue = q('test').expires(2000);
    await chain.queue(queue)
        // Take a 5 second break when there are 3 errors in 5 seconds
        .backoff(standardBackoff())
        .subscribe(({ data }) => {
            console.log(data);
            throw new Error('Failed to process message');
        });
    await chain.queue(queue).publish({ time: Date.now() });
};

process.nextTick(main);
