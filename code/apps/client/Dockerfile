FROM nginx:1.23.1-alpine
WORKDIR /app

COPY ./dist/apps/client /usr/share/nginx/html
COPY ./apps/client/nginx/.nginx /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]