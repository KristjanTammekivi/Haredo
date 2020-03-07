FROM rabbitmq:3.8.2-management

RUN apt-get update && \
    apt-get install unzip -y && \
    apt-get install wget -y

RUN cd /opt/rabbitmq/plugins && \
    whoami && \
    wget https://dl.bintray.com/rabbitmq/community-plugins/3.8.x/rabbitmq_delayed_message_exchange/rabbitmq_delayed_message_exchange-20191008-3.8.x.zip && \
    unzip rabbitmq_delayed_message_exchange-20191008-3.8.x.zip && \
    rabbitmq-plugins enable rabbitmq_delayed_message_exchange
