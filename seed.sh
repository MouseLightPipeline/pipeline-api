#!/usr/bin/env bash

if [ ! -z "$1" ]
  then
    export PIPELINE_DATABASE_HOST=$1
fi

if [ ! -z "$2" ]
  then
    export PIPELINE_DATABASE_PORT=$2
fi

if [ ! -z "$3" ]
  then
    export PIPELINE_SEED_ENV=$3
fi

if [ ! -z "$4" ]
  then
    export PIPELINE_VOLUME_PREFIX=$4
fi

echo "Seed for all databases."

echo "Seed postgres service"
sequelize db:seed:all
