#!/usr/bin/env bash

if [ ! -z "$1" ]
  then
    export PIPELINE_DATABASE_HOST=$1
fi

if [ ! -z "$2" ]
  then
    export PIPELINE_DATABASE_PORT=$2
fi

LAST_NODE_ENV=${NODE_ENV}

export NODE_ENV=production

echo "Migrate for all databases."

echo "Migrate postgres service"
sequelize db:migrate

echo "Migrate local sqlite cache"
knex migrate:latest

export NODE_ENV=${LAST_NODE_ENV}
