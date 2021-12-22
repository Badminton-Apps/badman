FROM node:12.22.0-alpine as build

# Work dir
WORKDIR /usr/src/app

# Set env values
ENV LOG_LEVEL=debug
ENV NODE_ENV=production

# Add lerna
COPY package.json lerna.json tsconfig.json tsconfig.build.json yarn.lock ./

# Copy packages
COPY packages/_shared ./packages/_shared
COPY packages/jobs ./packages/jobs

RUN yarn global add lerna
RUN lerna bootstrap --scope=@badvlasim/job  --ci -- --production=false
RUN lerna run build --scope=@badvlasim/job

# production environment
FROM node:12.22.0-slim
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Brussels
RUN apt-get install -y tzdata
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Work dir
WORKDIR /usr/src/app

COPY package.json lerna.json ./
COPY packages/_shared/package.json ./packages/_shared/
COPY packages/jobs/package.json ./packages/jobs/

RUN yarn global add lerna
# Only install production packages
RUN lerna bootstrap --scope=@badvlasim/job --ci -- --production

COPY --from=build /usr/src/app/packages/_shared/dist ./packages/_shared/dist
COPY --from=build /usr/src/app/packages/jobs/dist ./packages/jobs/dist

# Set env values
ENV LOG_LEVEL=debug
ENV NODE_ENV=production

RUN npm install pm2 -g
EXPOSE 4000

CMD ["pm2-runtime","packages/jobs/dist/server.js"]