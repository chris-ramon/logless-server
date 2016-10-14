FROM node:6.3.0

MAINTAINER OpenDog

EXPOSE 10000

WORKDIR /opt

RUN git clone https://github.com/bespoken/logless-server.git

WORKDIR /opt/logless-server

RUN npm install

CMD [ "npm", "start" ]

