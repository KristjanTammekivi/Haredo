FROM rabbitmq:3.8.2-management

RUN apt-get update && \
    apt-get install unzip -y && \
    apt-get install wget -y

RUN cd /opt/rabbitmq/plugins && \
    whoami && \
    wget https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v3.8.0/rabbitmq_delayed_message_exchange-3.8.0.ez && \
    unzip rabbitmq_delayed_message_exchange-3.8.0.ez && \
    rabbitmq-plugins enable rabbitmq_delayed_message_exchange
