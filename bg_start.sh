#!/usr/bin/env bash

if [ -z "$PIPELINE_DATABASE_HOST" ]; then
    export PIPELINE_DATABASE_HOST="localhost"
fi

if [ -z "$PIPELINE_DATABASE_PORT" ]; then
    export PIPELINE_DATABASE_PORT=5432
fi

./migrate.sh ${PIPELINE_DATABASE_HOST} ${PIPELINE_DATABASE_PORT}

nohup npm run dev &
