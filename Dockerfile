FROM node:12

WORKDIR /app

COPY dist .

RUN yarn global add sequelize-cli

RUN yarn --production install

RUN groupadd -g 1097 mousebrainmicro
RUN adduser -u 7700649 --disabled-password --gecos '' mluser
RUN usermod -a -G mousebrainmicro mluser

USER mluser

CMD ["./docker-entry.sh"]

EXPOSE  6001
