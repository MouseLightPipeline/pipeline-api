#!/usr/bin/env bash

LAST_NODE_ENV=${NODE_ENV}

export NODE_ENV=production

if [ -z "$PIPELINE_DATABASE_HOST" ]; then
    export PIPELINE_DATABASE_HOST="localhost"
fi

./migrate.sh ${PIPELINE_DATABASE_HOST}

npm run dev &

NODE_ENV=${LAST_NODE_ENV}
