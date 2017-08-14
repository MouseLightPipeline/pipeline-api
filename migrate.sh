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

migratePipelineDatabaseService()
{
    SUCCESS=1

    while [ ${SUCCESS} -ne 0 ]; do
        echo "Migrate postgres service"

        sequelize db:migrate
        SUCCESS=$?

        if [ ${SUCCESS} -ne 0 ]; then
            echo "Migration failed - waiting 5 seconds"
            sleep 5s
        fi
    done

    echo "Migrate postgres service complete"
}

migrateLocalCache()
{
    SUCCESS=1

    while [ ${SUCCESS} -ne 0 ]; do
        echo "Migrate local SQLITE cache"

        knex migrate:latest
        SUCCESS=$?

        if [ ${SUCCESS} -ne 0 ]; then
            echo "Migration failed - waiting 5 seconds"
            sleep 5s
        fi
    done

    echo "Migrate local SQLITE cache complete"
}

echo "Migrate for all databases."

migratePipelineDatabaseService

migrateLocalCache

export NODE_ENV=${LAST_NODE_ENV}

exit 0
