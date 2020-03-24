# Haredo

<Warning>Haredo version 2 introduces breaking changes. See [2.0 Changes](Changes-2.0.md)</Warning>

[![npm](https://img.shields.io/npm/v/haredo.svg)](https://www.npmjs.com/package/haredo)
[![npm](https://img.shields.io/npm/dw/haredo.svg)](https://www.npmjs.com/package/haredo)
[![Build Status](https://travis-ci.com/KristjanTammekivi/Haredo.svg?token=5sH57fp4gyjYbXpM9ZY9&branch=master)](https://travis-ci.com/KristjanTammekivi/Haredo)
[![Coverage Status](https://coveralls.io/repos/github/KristjanTammekivi/Haredo/badge.svg?branch=master)](https://coveralls.io/github/KristjanTammekivi/Haredo?branch=master)
[![David](https://img.shields.io/david/KristjanTammekivi/Haredo.svg)](https://david-dm.org/KristjanTammekivi/Haredo)

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

### Publishing to an exchange

```typescript
rabbit.excange('my-exchange').publish({ id: 5, status: 'active' }, 'item.created');
```

### Publishing to a queue

```typescript
rabbit.queue('my-queue').publish({ id: 5, status: 'inactive' }, 'item.modified');
```

### RPC

```typescript
rabbit.queue('sum')
    // With autoReply on, returned value from callback is automatically replied
    // Alternative is to use the reply/1 method on the message
    .autoReply()
    .subscribe(({ data }) => data[0] + data[1]);

const response = await rabbit.queue('sum').rpc([30, 12])
```

### Delayed messages

Note: this requires [RabbitMQ Delayed Message Plugin](https://github.com/rabbitmq/rabbitmq-delayed-message-exchange) to be installed on the server.

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

### Message throttling

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

### Graceful shutdown

Calling consumer.close() will send cancel to channel and wait for existing messages to be handled before resolving the returned promise.

Calling haredoInstance.close() will gracefully close all of it's consumers
