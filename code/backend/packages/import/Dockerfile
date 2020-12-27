# production environment
FROM node:12.2.0-alpine

# Work dir
WORKDIR /usr/src/app

# Set env values
ENV LOG_LEVEL=debug
ENV NODE_ENV=production

# Install dependencies
RUN apk --no-cache add curl gnupg tzdata

## TZ
ENV TZ=Europe/Brussels
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

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

# Add lerna
COPY package.json .
COPY tsconfig.json .
RUN npm i lerna -g --loglevel notice


# Copy packages
COPY packages/_shared ./packages/_shared
COPY packages/import ./packages/import

# bootstrap
COPY lerna.json .
RUN apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers unixodbc-dev make python && \
  lerna bootstrap --scope=@badvlasim/import -- --production=false && \
  apk del native-deps

EXPOSE 4000

CMD ["lerna", "run", "start", "--scope=@badvlasim/import", "--stream"]