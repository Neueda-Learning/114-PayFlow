#!/bin/sh
# Starts the Spring Boot backend and Nginx (frontend) in the same container.
# Exits (and lets Docker restart the container) if either process dies.
set -e

java -jar /app/app.jar &
BACKEND_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

wait -n "$BACKEND_PID" "$NGINX_PID"
exit $?
