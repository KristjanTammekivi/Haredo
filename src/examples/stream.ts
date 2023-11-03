import { Haredo } from '../haredo';
import { Queue } from '../queue';
import { HaredoInstance } from '../types';
import { delay } from '../utils/delay';

const stream = Queue<{ id: number }>('testStream').stream();

const addTime = (date: Date, seconds: number) => {
    return new Date(date.getTime() + seconds * 1000);
};

const start = async () => {
    const haredo = Haredo({ url: process.env.RABBIT_URL || 'amqp://localhost' });
    await haredo.connect();

    await publish(haredo, { id: 0 });

    await haredo
        .queue(stream)
        .streamOffset(addTime(new Date(), -100))
        .prefetch(1)
        .subscribe(async (data, { raw, streamOffset }) => {
            console.log(raw, streamOffset);
            console.log(new Date(), 'Message received:', data.id);
        });

    let iteration = 1;
    while (true) {
        await publish(haredo, { id: iteration++ });
        await delay(5000);
    }
};

interface Message {
    id: number;
}

const publish = async (haredo: HaredoInstance, message: Message) => {
    await haredo.queue(stream).publish(message);
};

process.nextTick(start);
