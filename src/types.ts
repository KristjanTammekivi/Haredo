export interface RabbitUrl {
    protocol: 'amqp' | 'amqps';
    username: string;
    password: string;
    hostname: string;
    port: number;
    vhost: string;
}
