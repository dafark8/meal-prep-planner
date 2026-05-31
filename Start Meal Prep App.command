#!/bin/bash
cd "$(dirname "$0")"
npm start &
SERVER_PID=$!
sleep 2
open http://localhost:3000
wait $SERVER_PID
