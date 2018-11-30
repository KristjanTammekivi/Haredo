FROM rabbitmq:3.7.8-management

RUN echo $RABBITMQ_PLUGINS_DIR

RUN apt-get update && \
    apt-get install unzip wget -y && \
    cd /usr/lib/rabbitmq/lib/rabbitmq_server-3.7.8/plugins && \
    whoami && \
    wget https://dl.bintray.com/rabbitmq/community-plugins/3.7.x/rabbitmq_delayed_message_exchange/rabbitmq_delayed_message_exchange-20171215-3.6.x.zip && \
    unzip rabbitmq_delayed_message_exchange-20171215-3.7.x.zip && \
    ls -halt && \
    rabbitmq-plugins enable rabbitmq_delayed_message_exchange
