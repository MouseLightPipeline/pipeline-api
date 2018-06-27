#!/usr/bin/env bash

logName=$(date '+%Y-%m-%d_%H-%M-%S');

mkdir -p ~/var/log/pipeline

./migrate.sh &> /var/log/pipeline/coordinator-${logName}.log

wait

export DEBUG=pipeline*

node server/pipelineApiApp.js >> /var/log/pipeline/coordinator-${logName}.log 2>&1
