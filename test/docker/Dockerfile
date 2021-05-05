FROM rabbitmq:3.8.16-management

RUN apt-get update && \
    apt-get install unzip -y && \
    apt-get install wget -y

RUN cd /opt/rabbitmq/plugins && \
    whoami && \
    wget https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/3.8.9/rabbitmq_delayed_message_exchange-3.8.9-0199d11c.ez && \
    rabbitmq-plugins enable rabbitmq_delayed_message_exchange
