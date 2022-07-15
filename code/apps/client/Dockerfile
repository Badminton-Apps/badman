FROM nginx:1.23.0-alpine
WORKDIR /app
COPY ./dist/apps/client /usr/share/nginx/html
COPY ./apps/client/nginx/nginx.conf /etc/nginx/conf.d/default.conf
ENV PORT=4000
EXPOSE ${PORT}
CMD ["nginx", "-g", "daemon off;"]