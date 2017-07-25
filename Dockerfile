FROM node:7.10

WORKDIR /app

RUN yarn global add typescript@2.3.4 sequelize-cli knex@0.13.0

COPY . .

RUN yarn install

RUN tsc

CMD ["npm", "run", "start"]

EXPOSE  3000
