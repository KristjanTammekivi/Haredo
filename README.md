# Haredo

[![Build Status](https://travis-ci.com/KristjanTammekivi/Haredo.svg?token=5sH57fp4gyjYbXpM9ZY9&branch=master)](https://travis-ci.com/KristjanTammekivi/Haredo)

Yet another Rabbit library

## Motivation

![xkcd 927: standards](https://imgs.xkcd.com/comics/standards.png)

For a long time I've been using [tortoise](https://www.npmjs.com/package/tortoise) as my go-to RabbitMQ client. I quite like the chaining API it has but tortoise does have it's downsides (it's not being maintained, accessing message metadata needs you to not use arrow functions, missing typings, etc.)

### Goals

- Chaining based API
- Possibility to type messages used in publishing/subscribing
- Preparable Queue and Exchange objects
- Easy to use:
    - Dead Letter
    - Delayed exchanges
    - RPC
    - Graceful shutdown
    - Mock

## TODOS

- [x] Message types for queues and exchanges
- [ ] Queue and exchange shorthands
- [x] Message chainable wrapper that you can prepare
- [x] Emit events from haredo
- [ ] Specific error types
- [ ] More examples
- [x] Travis / npm badges
- [ ] High test coverage
- [ ] Reestablish connections/consumers

### What I'm not happy with right now / thoughts

- Queues / Exchanges are reasserted for every new chain
- Storing bindings on a queue doesn't make sense
- Maybe store all asserted states on haredo object itself (would require adding isEqual methods)?
- Duplicating methods from HaredoChain to Haredo sucks, maybe just add .chain() on Haredo
- Not quite satisfied with the channelGetter pattern.
