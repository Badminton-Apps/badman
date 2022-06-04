FROM node:lts-alpine

WORKDIR /app
COPY ./dist/apps/worker/ranking .

RUN npx -y yarn install --production
# dependencies that nestjs needs
RUN npx -y yarn install reflect-metadata tslib rxjs @nestjs/platform-express

CMD node ./main.js