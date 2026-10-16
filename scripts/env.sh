#!/usr/bin/env bash
# Source from repository scripts. Explicit environment values take precedence.
export DATABASE_URL="${DATABASE_URL:-postgres://hydraflow:hydraflow@127.0.0.1:${HYDRAFLOW_DB_PORT:-54329}/hydraflow_development}"
export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgres://hydraflow:hydraflow@127.0.0.1:${HYDRAFLOW_DB_PORT:-54329}/hydraflow_test}"
export API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"
