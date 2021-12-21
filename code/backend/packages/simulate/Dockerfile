FROM node:12.22.0-alpine as build

# Work dir
WORKDIR /usr/src/app

# Set env values
ENV LOG_LEVEL=debug
ENV NODE_ENV=production

# Add lerna
COPY package.json .
COPY lerna.json .
COPY tsconfig.json .
COPY yarn.lock .

# Copy packages
COPY packages/_shared ./packages/_shared
COPY packages/simulate ./packages/simulate

RUN yarn global add lerna
RUN lerna bootstrap --scope=@badvlasim/simulate  --ci -- --production=false --frozen-lockfile
RUN lerna run build --scope=@badvlasim/simulate

# production environment
FROM node:12.22.0-slim
ARG DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Brussels
RUN apt-get install -y tzdata
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Work dir
WORKDIR /usr/src/app

COPY package.json .
COPY lerna.json .
COPY packages/_shared/package.json ./packages/_shared/
COPY packages/simulate/package.json ./packages/simulate/

RUN yarn global add lerna
# Only install production packages
RUN lerna bootstrap --scope=@badvlasim/simulate --ci -- --production

COPY --from=build /usr/src/app/dist .

# Set env values
ENV LOG_LEVEL=debug
ENV NODE_ENV=production

RUN npm install pm2 -g
EXPOSE 4000

CMD ["pm2-runtime","simulate/src/server.js"]
