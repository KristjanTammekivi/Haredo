# Haredo

![npm type definitions](https://img.shields.io/npm/types/typescript.svg)
![npm](https://img.shields.io/npm/dw/haredo.svg?color=%2374b9ff)
[![Build Status](https://travis-ci.com/KristjanTammekivi/Haredo.svg?token=5sH57fp4gyjYbXpM9ZY9&branch=master)](https://travis-ci.com/KristjanTammekivi/Haredo)
[![Coverage Status](https://coveralls.io/repos/github/KristjanTammekivi/Haredo/badge.svg?branch=master)](https://coveralls.io/github/KristjanTammekivi/Haredo?branch=master)
[![npm](https://img.shields.io/npm/v/haredo.svg)](https://www.npmjs.com/package/haredo)

![haredo](haredo.png)

Yet another RabbitMQ library

- [Motivation](#motivation)
- [Goals](#goals)
- [Examples](#examples)
- [Notes](#notes)

## Motivation

![xkcd 927: standards](https://imgs.xkcd.com/comics/standards.png)

For a long time I've been using [tortoise](https://www.npmjs.com/package/tortoise) as my go-to RabbitMQ client. I quite like the chaining API it has but tortoise does have it's downsides (it's not being maintained, accessing message metadata needs you to not use arrow functions, missing typings, etc.)

### Features

- Typescript based
- Chaining based API
- Possibility to type messages used in publishing/subscribing
- Preparable Queue and Exchange objects
- Graceful shutdown
- Easy to use:
    - Dead Letter
    - Delayed exchanges
    - Mock

## Examples

Note on methods: most methods are chainable and don't mutate, instead they return a clone of the object with the changes applied to it

```typescript
import { Haredo } from 'haredo';
const haredo = new Haredo({
    connection: 'amqp://localhost:5672/'
});
haredo.connect();
```

### Publishing to exchange

```typescript
haredo
    .exchange('myexchange', 'topic', { durable: true })
    .publish({ id: 52, status: 'active'}, 'item.created');
```

### Publishing to queue

```typescript
haredo.queue('myqueue').publish({ id: 52, status: 'active'});
```

### Prepared objects

```typescript
const exchange = new Exchange('myexchange', 'topic').durable();

haredo.exchange(exchange).publish(myMessage, routingKey);
```

### Subscribing

```typescript
haredo.exchange(exchange, '#')
    .queue(queue)
    .subscribe(async data => {
        // do stuff with the data, message will be acked after the promise this function returns is resolved
        // if it throws the message will be nacked/requeued
    });
```

### Subscribing with manual ack/nack

```typescript
haredo
    .exchange(exchange, '#')
    .queue(queue)
    .autoAck(false)
    .subscribe(async (data, message) => {
        try {
            // do stuff...
            message.ack();
        } catch (e) {
            if (e instanceof SomeError) {
                message.nack();
            } else {
                // Don't requeue the message
                message.nack(false);
            }
        }
    });
```

### Type stuff

```typescript
import { ExchangeType } from 'haredo';

interface MyMessage {
    id: number;
    status: string;
}

interface AnotherMessage {
    id: number;
    value: number;
}

const exchange = new Exchange<MyMessage>('myexchange', ExchangeType.Direct);
const queue = new Queue<AnotherMessage>('');

haredo.exchange(exchange).publish({ id: 5, status: 'inactive' });

haredo.exchange(exchange).publish({ id: 5  }); // TS Error: property status is missing in type ... but required in type MyMessage

haredo
    .exchange(exchange, '#')
    .queue(queue)
    .subscribe(data => { // Data is of type MyMessage | AnotherMessage

    });

```

### Setting loggers

By default [debug](https://www.npmjs.com/package/debug) is used as a logger (to use this set the env variable DEBUG=haredo).
This behaviour can be altered though.

```typescript
import { setLoggers } from 'haredo';
setLoggers({
    debug: (message) => console.log(message),
    info: (message) => console.info(message),
    error: (message) => console.error(message)
});
```

### Delayed messages
Note: this requires [RabbitMQ Delayed Message Plugin](https://github.com/rabbitmq/rabbitmq-delayed-message-exchange) to be installed on the server.

```typescript
const exchange = new Exchange('delayed-exchange').delayed('topic');
const message = new PreparedMessage().delay(15000).json({ id: 4 }).setRoutingKey('item.created');
haredo.exchange(exchange).publish(message); // Now message will be in the exchange for 15 seconds before being routed
```

## Unexpected behaviour

### Anonymous queues

When a queue doesn't have a name (when you pass either empty string / null / undefined as a name), RabbitMQ generates a
name starting with the prefix `amq.` for it automatically. As queues starting with that prefix are reserved, trying to
assert it will result in an error. Because of this the setup phase of queues that have that name will not be automatically
set up.

## Notes

Haredo wraps around [amqplib](https://www.npmjs.com/package/amqplib) and a number of docstrings for methods are either
paraphrased or directly taken from aqmplib's docs (https://www.squaremobius.net/amqp.node/channel_api.html)
