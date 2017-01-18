FROM node:6.3.0

MAINTAINER OpenDog

EXPOSE 10000

WORKDIR /opt

RUN git clone https://github.com/bespoken/logless-server.git

WORKDIR /opt/logless-server

RUN npm install

RUN node ./node_modules/typings/dist/bin.js install

RUN ./node_modules/typescript/bin/tsc -p .

CMD [ "npm", "start" ]

