# production environment
FROM node:12.22.0-alpine
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
COPY packages/jobs ./packages/jobs

# bootstrap
COPY lerna.json .
RUN lerna bootstrap --scope=@badvlasim/job  --ci -- --production=false

EXPOSE 4002

CMD ["lerna", "run", "start", "--scope=@badvlasim/job", "--stream", "--no-prefix"]
