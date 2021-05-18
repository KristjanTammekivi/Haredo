FROM ent.coolbet.com:5000/rabbitmq-base:3.8.16-management-b1

RUN apt-get update && \
    apt-get install wget -y && \
    apt-get clean

USER rabbitmq

# ENV RABBITMQ_DEFAULT_VHOST=test RABBITMQ_DEFAULT_USER=guest

RUN cd /opt/rabbitmq/plugins && \
    wget https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v3.8.0/rabbitmq_delayed_message_exchange-3.8.0.ez && \
    rabbitmq-plugins enable rabbitmq_delayed_message_exchange
