import { Haredo } from '../haredo';
import { delay } from '../utils/delay';

// declare module '../types' {
//     interface HaredoMessage<T> {
//         cid: string;
//     }
//     interface QueueChain<T> {
//         cid(cid: string): this;
//     }
// }

const start = async () => {
    const haredo = Haredo({
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
        await (haredo.queue<{ id: number }>('testQueue') as any)
            .cid(`message_${ iteration }`)
            .publish({ id: iteration });
        await delay(1000);
    }
};

process.nextTick(start);
