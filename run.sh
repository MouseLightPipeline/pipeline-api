#!/usr/bin/env bash

if [ -a "options.sh" ]; then
    source "options.sh"
fi

if [ -z "$PIPELINE_DATABASE_HOST" ]; then
    export PIPELINE_DATABASE_HOST="localhost"
fi

if [ -z "$PIPELINE_DATABASE_PORT" ]; then
    export PIPELINE_DATABASE_PORT=3932
fi

./migrate.sh ${PIPELINE_DATABASE_HOST} ${PIPELINE_DATABASE_PORT}

nohup npm run devel &

chmod 664 nohup.out
