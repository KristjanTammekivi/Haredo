import { RabbitAdmin, RabbitmqInterface } from 'rabbitmq-admin';

export const rabbitAdmin: RabbitmqInterface = RabbitAdmin({
    rabbitHost: 'http://localhost:15672',
    pass: 'guest',
    user: 'guest'
});
