FROM rabbitmq:3.6.16-management

RUN echo $RABBITMQ_PLUGINS_DIR

RUN apt-get update && \
    apt-get install unzip wget -y && \
    cd /usr/lib/rabbitmq/lib/rabbitmq_server-3.6.16/plugins && \
    whoami && \
    wget https://dl.bintray.com/rabbitmq/community-plugins/3.6.x/rabbitmq_delayed_message_exchange/rabbitmq_delayed_message_exchange-20171215-3.6.x.zip && \
    unzip rabbitmq_delayed_message_exchange-20171215-3.6.x.zip && \
    ls -halt && \
    rabbitmq-plugins enable rabbitmq_delayed_message_exchange

#docker run -d --hostname my-rabbit -p 127.0.0.1:5672:5672 -p 127.0.0.1:15672:15672  --name some-rabbit rabbitmq:3.6.16-management