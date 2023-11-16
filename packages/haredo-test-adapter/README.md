# haredo-test-adapter

This is a test adapter for Haredo. Use with Haredo>=3.0.0

# Usage

All original methods are replaced with sinon stubs. You can use them to assert that the methods are called with the correct arguments.

In addition to that there are some helper methods and properties to make testing easier, like callSubscriber which emulates a rabbit message arriving to the subscriber of the specified queue.

Also, some RabbitMQ behavior is being emulated, like the fact that when trying to assert a queue twice with different parameters then the second call will reject with an error.

```typescript
import { Haredo } from 'haredo';
import { createTestAdapter } from 'haredo-test-adapter';

const adapter = createTestAdapter();

const haredo = Haredo({ adapter, url: process.env.RABBIT_URL });

haredo.queue('testQueue').subscribe((message) => {
  console.log(message);
});

haredo.callSubscriber('testQueue', JSON.stringify({ test: 'test' }));

assert.equal(adapter.createQueue.callCount, 1);
```

## Helper methods and properties

### reset()

Recreates all stubs and clears all queues, exchanges and subscribers

### callSubscriber(queueName, message)

Calls the subscriber for the specified queueName with the specified message. Typically the message should be a valid JSON string (unless in the subscriber you have called .json(false))

### subscribers: Subscriber[]

This array stores all current subscribers. When cancelling a consumer it will be removed from the list

### queues: Queue[]

Stores all created queues and their parameters

### exchanges: Exchange[]

Stores all created exchanges and their parameters


