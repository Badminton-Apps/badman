FROM nginx:1.16.0-alpine
WORKDIR /app
COPY ./dist/apps/client .
ENV PORT=4000
EXPOSE ${PORT}
CMD ["nginx", "-g", "daemon off;"]