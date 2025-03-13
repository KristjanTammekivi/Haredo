import { Haredo } from '../haredo';
import { ExchangeChain, QueueChain } from '../types';
import { delay } from '../utils/delay';

interface Extension {
    queue: {
        /** Add a cid header to publishing */
        cid<T>(cid: string): QueueChain<T>;
    };
    exchange: {
        /** Add a cid header to publishing */
        cid<T>(cid: string): ExchangeChain<T>;
    };
}

const start = async () => {
    const haredo = Haredo<Extension>({
        url: process.env.RABBIT_URL || 'amqp://localhost',
        globalMiddleware: [
            (message) => {
                (message as any).cid = message.headers?.['x-cid'] as string;
            }
        ],
        extensions: [
            {
                name: 'cid',
                queue: (state) => {
                    return (cid: string) => ({
                        ...state,
                        headers: {
                            ...state.headers,
                            'x-cid': cid
                        }
                    });
                },
                exchange: (state) => {
                    return (cid: string) => ({
                        ...state,
                        headers: {
                            ...state.headers,
                            'x-cid': cid
                        }
                    });
                }
            }
        ]
    });
    await haredo.connect();

    await haredo.queue<{ id: number }>('testQueue').subscribe(async ({ id }, { cid }: any) => {
        console.log(new Date(), 'Message received:', cid, id);
    });

    let iteration = 1;
    while (true) {
        iteration++;
        await haredo.queue<{ id: number }>('testQueue').cid(`message_${ iteration }`).publish({ id: iteration });
        await delay(1000);
    }
};

process.nextTick(start);
