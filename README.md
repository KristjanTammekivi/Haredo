# Haredo

<Warning>Haredo version 2 introduces breaking changes. See [2.0 Changes](Changes-2.0.md)</Warning>

[![npm](https://img.shields.io/npm/v/haredo.svg)](https://www.npmjs.com/package/haredo)
[![npm](https://img.shields.io/npm/dw/haredo.svg)](https://www.npmjs.com/package/haredo)
[![Build Status](https://travis-ci.com/KristjanTammekivi/Haredo.svg?token=5sH57fp4gyjYbXpM9ZY9&branch=master)](https://travis-ci.com/KristjanTammekivi/Haredo)
[![Coverage Status](https://coveralls.io/repos/github/KristjanTammekivi/Haredo/badge.svg?branch=master)](https://coveralls.io/github/KristjanTammekivi/Haredo?branch=master)
![Libraries.io dependency status for latest release](https://img.shields.io/librariesio/release/npm/haredo)

![haredo](haredo.png)

Yet another RabbitMQ library

- [Motivation](#motivation)
- [Features](#features)
- [Usage](#usage)

## Motivation

![xkcd 927: standards](https://imgs.xkcd.com/comics/standards.png)

*[xkcd 927: standards](https://xkcd.com/927/)*

For a long time I've been using [tortoise](https://www.npmjs.com/package/tortoise) as my go-to RabbitMQ client. I quite like the chaining API it has but tortoise does have it's downsides (it's not being maintained, accessing message metadata needs you to not use arrow functions, missing typings, etc.)

## Features

 - TypeScript
 - Chaining based API
 - Graceful closing
 - RPC

## Usage

Working examples are available on [github](https://github.com/KristjanTammekivi/Haredo/tree/master/src/examples)

### Initializing

```typescript
import { haredo } from 'haredo';
const rabbit = haredo({
    connection: 'amqp://localhost:5672/'
});
```

### Listening for messages

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/routing.ts)_

```typescript
rabbit.queue('my-queue')
    .bindExchange('testExchange', '#', 'topic', { durable: false }) // Can be omitted if you don't want to bind the queue to an exchange right now
    .subscribe(async (message) => {
        console.log(message);
    });
```

### Publishing to an exchange

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/routing.ts#L26)_

```typescript
rabbit.exchange('my-exchange').publish({ id: 5, status: 'active' }, 'item.created');
```

### Publishing to a queue

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/simple.ts#L16)_

```typescript
rabbit.queue('my-queue').publish({ id: 5, status: 'inactive' });
```

### Limit concurrency

```typescript
rabbit.queue('my-queue')
    .prefetch(5) // same as .concurrency(5)
    .subscribe(async (message) => {
        console.log(message);
    });
```

### RPC

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/rpc.ts)_
```typescript
rabbit.queue('sum')
    // With autoReply on, returned value from callback is automatically replied
    // Alternative is to use the reply/1 method on the message
    .autoReply()
    .subscribe(({ data }) => data[0] + data[1]);

const response = await rabbit.queue('sum').rpc([30, 12])
```

### Delayed messages

Note: this requires [RabbitMQ Delayed Message Plugin](https://github.com/rabbitmq/rabbitmq-delayed-message-exchange) to be installed and enabled on the server.

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/delayed-exchange.ts)_

```typescript
interface Message {
    id: number;
}
const delayedExchange = e<Message>('my-delayed-exchange', 'x-delayed-message').delayed('topic');
await rabbit.queue('my-queue')
    .bindExchange(delayedExchange, '#')
    .subscribe(({ data, timestamp }) => {
        console.log(`Received message in ${ Date.now() - timestamp }ms id:${ data.id } `);
    });
const delayedMessage = preparedMessage().routingKey('item').delay(2000);
let id = 0;
while (true) {
    id += 1;
    console.log('Publishing message', id);
    const msg = delayedMessage.json({ id }).timestamp(Date.now());
    await rabbit
        .exchange(delayedExchange)
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
await rabbit.queue('my-queue')
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

[View on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/dlx.ts)

### Middleware

_[example on GitHub](https://github.com/KristjanTammekivi/Haredo/blob/master/src/examples/middleware.ts)_

```typescript
import { Middleware } from 'haredo';

const timeMessage: Middleware = ({ queue }, next) => {
    const start = Date.now();
    await next();
    console.log(`Message took ${ Date.now() - start }ms`);
}

await rabbit.queue('my-queue')
    .use(timeMessage)
    .subscribe(() => {
        throw new Error('Nack this message for me')
    });
```

### Graceful shutdown

Calling consumer.close() will send cancel to channel and wait for existing messages to be handled before resolving the returned promise.

Calling haredoInstance.close() will gracefully close all of it's consumers
