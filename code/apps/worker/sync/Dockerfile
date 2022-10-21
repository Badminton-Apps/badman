FROM node:lts-alpine

WORKDIR /app
COPY ./dist/apps/worker/sync .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn

RUN npx -y yarn --production
# dependencies that nestjs needs
RUN npx -y yarn add reflect-metadata tslib rxjs @nestjs/platform-express

EXPOSE 4000

CMD node ./main.js