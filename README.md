# Haredo

[![Build Status](https://travis-ci.com/KristjanTammekivi/Haredo.svg?token=5sH57fp4gyjYbXpM9ZY9&branch=master)](https://travis-ci.com/KristjanTammekivi/Haredo)
[![npm](https://img.shields.io/npm/v/haredo.svg)](https://www.npmjs.com/package/haredo)[![Coverage Status](https://coveralls.io/repos/github/KristjanTammekivi/Haredo/badge.svg?branch=master)](https://coveralls.io/github/KristjanTammekivi/Haredo?branch=master)

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

- [x] Queue and exchange shorthands
- [ ] Emit events from haredo
- [ ] Specific error types
- [ ] More examples
- [ ] High test coverage

## Notes

Haredo wraps around [amqplib](https://www.npmjs.com/package/amqplib) and a number of docstrings for methods are either
paraphrased or directly taken from aqmplib's docs (https://www.squaremobius.net/amqp.node/channel_api.html)
