FROM rabbitmq:3.8.0-management

RUN apt-get update && \
    apt-get install unzip -y && \
    apt-get install wget -y

RUN cd /usr/lib/rabbitmq/lib/rabbitmq_server-3.7.8/plugins && \
    whoami && \
    wget https://dl.bintray.com/rabbitmq/community-plugins/3.7.x/rabbitmq_delayed_message_exchange/rabbitmq_delayed_message_exchange-20171201-3.7.x.zip && \
    unzip rabbitmq_delayed_message_exchange-20171201-3.7.x.zip && \
    rabbitmq-plugins enable rabbitmq_delayed_message_exchange
