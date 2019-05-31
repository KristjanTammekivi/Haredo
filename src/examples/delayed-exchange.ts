import { Queue } from '../queue';
import { Haredo } from '../haredo';
import { Exchange } from '../exchange';
import { PreparedMessage } from '../prepared-message';

export const main = async () => {
    const haredo = new Haredo();
    await haredo.connect();
    interface SimpleMessage {
        test: boolean;
    }
    const queue = new Queue<SimpleMessage>('test');
    const exchange = new Exchange<SimpleMessage>('test').delayed('direct');
    const message = new PreparedMessage<SimpleMessage>({}).json({ test: true }).delay(15000);
    await haredo.exchange(exchange).queue(queue).publish(message);
};

process.nextTick(main);
