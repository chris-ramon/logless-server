FROM node:6.3.0

MAINTAINER OpenDog

EXPOSE 10000

WORKDIR /opt

ENV BST_MONGO_URL mongodb://xappuser:Winter123@ds029804.mlab.com:29804/xapplog

RUN git clone https://github.com/bespoken/logless-server.git

WORKDIR /opt/logless-server

RUN npm install

CMD [ "npm", "start" ]

