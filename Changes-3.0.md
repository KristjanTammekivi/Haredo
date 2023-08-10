# 3.0 Changes

# Bye amqplib

Amqplib has served the community well but after all this time it still doesn't
ship types with it, it has a very large code, the API is full of quirks I needed
to work around etc.

By instead using @cloudamqp/amqp-client I can remove a lot of code on haredo
side, like the handling of when it's ok to fulfill the promise when publishing.

# Removed built-in rpc

I added it for the sake of completeness, but I still haven't used it outside of
the test suite, so I decided to remove it to reduce the codebase size even further.

# Adapter

V3 allows passing in an adapter, this will allow creating a test adapter for
integration tests for end users, and the test suite for Haredo uses this tactic
too.

# Changed names

* haredo -> Haredo
* makeExchangeConfig -> Exchange
* makeQueueConfig -> Queue
* preparedMessage -> Message

# Split publishing and subscribing queue chains

This is a type-only change, should help avoid logical errors.
Before it was allowed to do the following

```ts
haredo.queue('test')
    .bindExchange('testExchange', 'topci', '#')
    .publish('Message');
```

This however doesn't make sense, since the message is published to the queue but
it also adds a binding. In v3 this is a type error

# Removed preparedMessage

Methods from preparedMessage were moved directly to the chain

```ts
haredo.exchange('someExchange', 'topic')
    .delay(60 * 1000)
    .publish(data)
```
