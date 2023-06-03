# Build stage
FROM node:19-alpine AS build
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
RUN npm run build api:build -- --configuration=production

# Production stage
FROM node:19-alpine As production
ENV NODE_ENV=production \
    TZ="Europe/Brussels" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

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
EXPOSE 5000
CMD [ "dumb-init", "node", "./dist/apps/api/main.js"]