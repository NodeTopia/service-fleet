
FROM   node:11


RUN mkdir /app
COPY . /app

WORKDIR /app

RUN npm install


CMD ["npm", "start" ]