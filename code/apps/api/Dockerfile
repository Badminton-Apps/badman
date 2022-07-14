FROM node:lts-alpine

WORKDIR /app
COPY ./dist/apps/api .

RUN npx -y yarn --production
# dependencies that nestjs needs
RUN npx -y yarn add reflect-metadata tslib rxjs @nestjs/platform-express

EXPOSE 4000

CMD node ./main.js