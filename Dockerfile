FROM node:7.10

WORKDIR /app

RUN yarn global add typescript sequelize-cli knex

COPY . .

RUN yarn install

RUN tsc

CMD ["npm", "run", "start"]

EXPOSE  3000
