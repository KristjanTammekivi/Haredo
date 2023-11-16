import { standardBackoff } from '../backoffs';
import { Haredo } from '../haredo';

const start = async () => {
    const haredo = Haredo({ url: process.env.RABBIT_URL || 'amqp://localhost' });
    await haredo.connect();

    let index = 0;

    const failThreshold = 3;
    const failSpan = 1000;
    const failTimeout = 5000;
    await haredo
        .queue<{ id: number }>('testQueue')
        .concurrency(1)
        .backoff(standardBackoff({ failSpan, failThreshold, failTimeout }))
        .subscribe(async (data) => {
            index++;
            console.log(new Date(), 'Message received:', data.id);
            if (index % failThreshold === 0) {
                console.log(
                    new Date(),
                    `Subscribe failed ${ failThreshold } times in ${ failSpan }ms, Haredo will now pause for ${ failTimeout }ms`
                );
            }
            throw new Error('Something went wrong, requeue the message');
        });

    await haredo.queue<{ id: number }>('testQueue').publish({ id: 1 });
};

process.nextTick(start);
