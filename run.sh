#!/usr/bin/env bash

LAST_NODE_ENV=${NODE_ENV}

if [ -z "$1" ]; then
    export NODE_ENV=production
else
    export NODE_ENV=${1}
fi

nohup npm run dev &

NODE_ENV=${LAST_NODE_ENV}
