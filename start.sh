#!/usr/bin/env bash

LAST_NODE_ENV=${NODE_ENV}

export NODE_ENV=production

if [ -z "$PIPELINE_DATABASE_HOST" ]; then
    export PIPELINE_DATABASE_HOST="pipeline-db"
fi

if [ -z "$PIPELINE_DATABASE_PORT" ]; then
    export PIPELINE_DATABASE_PORT=5432
fi

./migrate.sh ${PIPELINE_DATABASE_HOST} ${PIPELINE_DATABASE_PORT}

npm run dev

export NODE_ENV=${LAST_NODE_ENV}

sleep infinity
