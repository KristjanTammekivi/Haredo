# Changes in haredo@2

## Split queues

In haredo@1 You could start a queue based chain with both haredo.queue(...).exchange(...) and haredo.exchange(...).queue(...). This causes some ambiguity in the API though (eg. if You only use .exchange then the subscribe method is there, but using it throws a runtime error). To reduce the chances of misusing the library I've limited the user. Now, if You plan on subscribing, You have to start off with .queue.

## Classes

I've moved (mostly) away from classes to using closures to contain the state. Initially this was to allow for a better code reuse in the split chains but it also helps by enabling users to destructure methods.

## Subscribing changes

The signatures for subscribe callback and middleware were different and it always irked me. Now they're somewhat unified.

```typescript
// haredo@1:
haredo.queue('test')
    .use(async (message, next) => {
        if (message.data.id === 2) {
            return message.ack();
        }
        await next();
        console.log('handled message successfully');
    })
    .subscribe((data, message) => {
        console.log(data.id);
        message.nack(false);
    });

// haredo@2:
haredo.queue('test')
    .use(async ({ data, ack }, next) => {
        if (message.data.id === 2) {
            return ack();
        }
        await next();
        console.log('handled message successfully');
    })
    .subscribe(({ data, nack }) => {
        console.log(data.id);
        await nack();
    });
```

## Anonymous queues

Anonymous queues are now always marked with autoDelete: true.
