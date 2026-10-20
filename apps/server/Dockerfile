# syntax=docker/dockerfile:1
# Production image for the Flowfokus Rails API.
# Build:  docker build -t flowfokus-server apps/server
# Run:    docker run -p 3000:3000 -e DATABASE_URL=... -e SECRET_KEY_BASE=... flowfokus-server
# Migrate as a separate release step (never on boot):
#         docker run --rm -e DATABASE_URL=... -e SECRET_KEY_BASE=... flowfokus-server bin/rails db:migrate
# Local development uses Dockerfile.dev instead.

ARG RUBY_VERSION=3.4.5
FROM docker.io/library/ruby:${RUBY_VERSION}-slim AS base

WORKDIR /rails

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl libjemalloc2 libpq5 postgresql-client && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development:test" \
    LD_PRELOAD="libjemalloc.so.2" \
    RAILS_LOG_TO_STDOUT="true" \
    FLOWFOKUS_DEMO_MODE="false"

FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

COPY Gemfile Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

COPY . .
# Test and development files never ship.
RUN rm -rf spec .rspec Dockerfile.dev log/* tmp/* && \
    bundle exec bootsnap precompile app/ lib/

FROM base

RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash

COPY --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=build --chown=rails:rails /rails /rails
RUN mkdir -p log tmp/pids && chown -R rails:rails log tmp

USER 1000:1000

# Liveness only. It does not touch the database. Use GET /ready for database readiness.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/up || exit 1

ENTRYPOINT ["/rails/bin/docker-entrypoint"]
EXPOSE 3000
CMD ["bin/rails", "server", "-b", "0.0.0.0", "-p", "3000"]
