# production environment
FROM node:12.2.0-alpine
RUN apk add --no-cache tzdata
ENV TZ=Europe/Brussels
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Work dir
WORKDIR /usr/src/app

# Set env values
ENV LOG_LEVEL=debug
ENV NODE_ENV=production

# Add lerna
COPY package.json .
COPY tsconfig.json .
RUN npm i lerna -g --loglevel notice

# Copy packages
COPY packages/_shared ./packages/_shared
COPY packages/simulate ./packages/simulate

# bootstrap
COPY lerna.json .
RUN lerna bootstrap --scope=@badvlasim/simulate -- --production=false

EXPOSE 4000

CMD ["lerna", "run", "start", "--scope=@badvlasim/simulate", "--stream"]