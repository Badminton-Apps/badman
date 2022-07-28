FROM node:lts-alpine

WORKDIR /app
COPY ./dist/apps/api .

RUN npx -y yarn --production
# dependencies that nestjs needs
RUN npx -y yarn add reflect-metadata tslib rxjs @nestjs/platform-express

# ENV values
ENV LOG_LEVEL=debug
ENV NODE_ENV=production

EXPOSE 4000

CMD node ./main.js