#!/usr/bin/env bash

if [ ! -z "${PIPELINE_PERFORM_MIGRATION}" ]; then
    ./migrate.sh
fi

node server/pipelineApiApp.js

sleep infinity
