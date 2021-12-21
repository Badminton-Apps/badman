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
COPY tsconfig.build.json .
COPY yarn.lock .

# Copy packages
COPY packages/_shared ./packages/_shared
COPY packages/import ./packages/import

RUN yarn global add lerna
RUN lerna bootstrap --scope=@badvlasim/import  --ci -- --production=false
RUN lerna run build --scope=@badvlasim/import

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
COPY packages/import/package.json ./packages/import/

RUN yarn global add lerna
# Only install production packages
RUN lerna bootstrap --scope=@badvlasim/import --ci -- --production

COPY --from=build /usr/src/app/packages/import/dist ./packages/import/dist

# Set env values
ENV LOG_LEVEL=debug
ENV NODE_ENV=production

RUN apk --no-cache add wget ca-certificates \
    autoconf \
    automake \
    build-base \
    glib \
    glib-dev \
    libc-dev \
    libtool \
    linux-headers \
    bison flex-dev unixodbc unixodbc-dev txt2man man \
    unrar p7zip && \
	  cd /tmp && \
  	wget "https://github.com/brianb/mdbtools/archive/0.7.1.zip" && \
    unzip 0.7.1.zip && rm 0.7.1.zip && \
    cd mdbtools-0.7.1 && \
    autoreconf -i -f && \
    ./configure --with-unixodbc=/usr/local && make && make install && \
    cd /tmp && \
    apk del autoconf automake build-base glib-dev libc-dev unixodbc-dev flex-dev && \
    rm -rf mdbtools-0.7.1

# bootstrap
RUN apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers unixodbc-dev make python && \
  lerna bootstrap --scope=@badvlasim/import  --ci -- --production=false && \
  apk del native-deps


RUN npm install pm2 -g
EXPOSE 4000

CMD ["pm2-runtime","packages/import/dist/server.js"]
