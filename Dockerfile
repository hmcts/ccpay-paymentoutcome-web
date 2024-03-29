# ---- Base image ----
FROM hmctspublic.azurecr.io/base/node:18-alpine as base

USER root
RUN corepack enable
USER hmcts

COPY --chown=hmcts:hmcts . .
RUN yarn workspaces focus --all --production && yarn cache clean

# ---- Build image ----
FROM base as build
RUN yarn install && yarn build:prod

# ---- Runtime image ----
FROM base as runtime
RUN rm -rf webpack/ webpack.config.js
COPY --from=build $WORKDIR/src/main ./src/main
# TODO: expose the right port for your application
EXPOSE 3100
RUN export NODE_OPTIONS=--openssl-legacy-provider
CMD [ "yarn", "start" ]
