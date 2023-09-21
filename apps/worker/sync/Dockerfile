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
RUN npm run build worker-sync:build -- --configuration=$CONFIGURATION

# Production stage
FROM node:20-alpine As production
ENV NODE_ENV=production \
    TZ="Europe/Brussels" \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
    
# get max-old-space-size from arg with default value 512 (not used yet)
ARG MAX_OLD_SPACE_SIZE=512

RUN apk add --no-cache \
    dumb-init \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
EXPOSE 4000
# Start the server using the production build
CMD [ "dumb-init", "node", "--max-old-space-size=512", "./dist/apps/worker/sync/main.js"]