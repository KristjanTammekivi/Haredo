# Haredo

<Warning>Haredo version 3 introduces breaking changes. See [3.0 Changes](Changes-3.0.md)</Warning>

[![npm](https://img.shields.io/npm/v/haredo.svg)](https://www.npmjs.com/package/haredo)
[![npm](https://img.shields.io/npm/dw/haredo.svg)](https://www.npmjs.com/package/haredo)
[![Build Status](https://travis-ci.com/KristjanTammekivi/Haredo.svg?token=5sH57fp4gyjYbXpM9ZY9&branch=master)](https://travis-ci.com/KristjanTammekivi/Haredo)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/haredo)

RabbitMQ client for Node.js with a focus on simplicity and type safety.

## Table of Contents

- [Features](#features)
- [Usage](#usage)
- [Initializing](#initializing)
- [Listening for messages](#listening-for-messages)
- [Publishing to an exchange](#publishing-to-an-exchange)
- [Publishing to a queue](#publishing-to-a-queue)
- [Limit concurrency](#limit-concurrency)
- [Delayed messages](#delayed-messages)
- [Quorum queues with delivery limits](#quorum-queues-with-delivery-limits)
- [Message throttling](#message-throttling)
- [Dead letter](#dead-letter)
- [Middleware](#middleware)
- [Graceful shutdown](#graceful-shutdown)
- [Automatic setup](#automatic-setup)
- [Extending Haredo](#extending-haredo)
- [Global middleware](#global-middleware)

## Features

 - TypeScript
 - Chaining based API
 - Graceful closing
 - Automatic setup of queues and exchanges
 - Automatic acking / nacking based on the promise returned from the subscriber

## Usage

Working examples are available on [github](https://github.com/KristjanTammekivi/Haredo/tree/master/src/examples)

### Initializing

```typescript
import { Haredo } from 'haredo';
const haredo = Haredo({
    url: 'amqp://localhost:5672/'
});
```

### Listening for messages

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/routing.ts)_

```typescript
haredo.queue('my-queue')
    .bindExchange('testExchange', '#', 'topic', { durable: false }) // Can be omitted if you don't want to bind the queue to an exchange right now
    .subscribe(async (message) => {
        console.log(message.data);
    });
```

### Publishing to an exchange

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/routing.ts)_

```typescript
haredo.exchange('my-exchange').publish({ id: 5, status: 'active' }, 'item.created');
```

### Publishing to a queue

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/simple.ts)_

```typescript
haredo.queue('my-queue').publish({ id: 5, status: 'inactive' });
```

### Limit concurrency

```typescript
haredo.queue('my-queue')
    .prefetch(5) // same as .concurrency(5)
    .subscribe(async (message) => {
        console.log(message);
    });
```

### Delayed messages

Note: this requires [RabbitMQ Delayed Message Plugin](https://github.com/rabbitmq/rabbitmq-delayed-message-exchange) to be installed and enabled on the server.

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/delayed-exchange.ts)_

```typescript
interface Message {.exchange
    id: number;
}
const delayedExchange = Exchange<Message>('my-delayed-exchange', 'x-delayed-message').delayed('topic');
await haredo.queue('my-queue')
    .bindExchange(delayedExchange, '#')
    .subscribe((data, { timestamp }) => {
        console.log(`Received message in ${ Date.now() - timestamp }ms id:${ data.id } `);
    });
let id = 0;
while (true) {
    id += 1;
    console.log('Publishing message', id);
    const msg = delayedMessage.json({ id }).timestamp(Date.now());
    await haredo
        .exchange(delayedExchange)
        .delay(1000)
        .publish(msg);
    await delay(2000);
}
```

### Quorum queues with delivery limits

Node: requires RabbitMQ 3.8.0 or higher, see [Quorum Queues Overview](https://www.rabbitmq.com/quorum-queues.html) for more information.

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/quorum.ts)_

### Message throttling

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/backoff.ts)_

```typescript
await haredo.queue('my-queue')
    .backoff(standardBackoff({
        failThreshold: 3,
        failSpan: 5000,
        failTimeout: 5000
    }))
    .subscribe(() => {
        throw new Error('Nack this message for me')
    });
```

### Dead letter

[View on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/dead-letter-exchange.ts)

### Middleware

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/middleware.ts)_

```typescript
import { Middleware } from 'haredo';

const timeMessage: Middleware = ({ queue }, next) => {
    const start = Date.now();
    await next();
    console.log(`Message took ${ Date.now() - start }ms`);
}

await haredo.queue('my-queue')
    .use(timeMessage)
    .subscribe(() => {
        throw new Error('Nack this message for me')
    });
```

### Graceful shutdown

Calling consumer.close() will send cancel to channel and wait for existing messages to be handled before resolving the returned promise.

Calling haredoInstance.close() will gracefully close all of it's consumers

### Automatic setup

By default Haredo will automatically assert the queus and exchanges and bind them
to each other. This can be disabled by calling .skipSetup()

```typescript
await haredo.queue('my-queue')
    .skipSetup()
    .subscribe(() => {
        throw new Error('Nack this message for me');
    });

// Only create the queue, don't bind it to any exchanges and don't create any exchanges
await haredo.queue('my-queue')
    .bindExchange('testExchange', '#', 'topic', { durable: false })
    .skipSetup({ skipBoundExchanges: true, skipBindings: true, skipCreate: false });

```

### Extending Haredo

Add new methods to the Haredo instance

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/extensions.ts)_

```typescript

declare module 'haredo/types' {
    interface QueueChain<T> {
        cid(cid: string): this;
    }
}

const haredo = Haredo({
    url: 'amqp://localhost:5672/'
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

await haredo.queue('my-queue')
    .cid('123')
    .publish({ id: 5, status: 'inactive' });
```

### Global middleware

Add a middleware that will be called for every message in every subscriber

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/extensions.ts)_

```typescript
declare module 'haredo/types' {
    interface HaredoMessage<T> {
        cid?: string;
    }
}
const haredo = Haredo({
    url: 'amqp://localhost:5672/'
    globalMiddleware: [
        (message) => {
            message.cid = message.headers?.['x-cid'] as string;
        }
    ]
});
```