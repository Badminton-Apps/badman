FROM node:lts-alpine

RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm


WORKDIR /app
COPY ./dist/apps/api .

RUN pnpm install --frozen-lockfile --prod

EXPOSE 4000

CMD node ./main.js