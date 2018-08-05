import * as amqplib from 'amqplib';

let connection: amqplib.Connection;

export const getConnection = async (connectOptions: string | amqplib.Options.Connect): Promise<amqplib.Connection> => {
    if (connection) {
        return connection;
    }
    connection = await amqplib.connect(connectOptions);
    connection.once('close', () => {
        connection = undefined;
    });
    // connection.on('error', e => console.error('connectionerror', e));
    return connection;
};
