# Haredo

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

## Usage

```typescript
import { Haredo } from 'haredo';
const haredo = new Haredo({
    connection: 'amqp://localhost:5672/'
});
```

### Publishing to an exchange

```typescript
haredo.excange('my-exchange').publish({ id: 5, status: 'active' }, 'item.created');
```

### Publishing to a queue

```typescript
haredo.queue('my-queue').publish({ id: 5, status: 'inactive' }, 'item.modified');
```
