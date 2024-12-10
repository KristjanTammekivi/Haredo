FROM rabbitmq:3.13.7-management

RUN apt-get update && \
    apt-get install wget -y && \
    apt-get clean

USER rabbitmq

# ENV RABBITMQ_DEFAULT_VHOST=test RABBITMQ_DEFAULT_USER=guest

RUN cd /opt/rabbitmq/plugins && \
    wget https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v3.13.0/rabbitmq_delayed_message_exchange-3.13.0.ez && \
    rabbitmq-plugins enable rabbitmq_delayed_message_exchange
