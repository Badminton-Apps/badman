# Build stage
FROM node:20-alpine AS build
WORKDIR /usr/src/app
COPY . .
RUN apk add --no-cache --virtual .build-deps \
    build-base \
	g++ \
	cairo-dev \
	jpeg-dev \
	pango-dev \
	giflib-dev
RUN npm ci
# Get the configuration from the environment variables
ARG CONFIGURATION=production
RUN npm run build:server -- --configuration=$CONFIGURATION

# Production stage
FROM node:20-alpine As production
ENV NODE_ENV=production \
    TZ="Europe/Brussels" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# get port from arg with default value 5000
ARG PORT=5000

RUN apk add --no-cache \
    tzdata\
    dumb-init \
    chromium \
    cairo \
	jpeg \
	pango \
	giflib

USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules


EXPOSE $PORT
CMD [ "dumb-init", "node",  "./dist/apps/api/main.js"]