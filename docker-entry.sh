#!/usr/bin/env bash

logName=$(date '+%Y-%m-%d_%H-%M-%S')

logPrefix="api"

logBase=/var/log/pipeline

logFile=${logPrefix}-${logName}.log

logPath=${logBase}/${logFile}

mkdir -p ${logBase}

touch ${logPath}

chown mluser:mousebrainmicro ${logPath}

./migrate.sh >> ${logPath} 2>&1

wait

export DEBUG=pipeline*

node server/pipelineApiApp.js >> ${logPath} 2>&1
