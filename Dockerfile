# Serves the prebuilt site (npm run build -> dist/) as a non-root static server.
FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03

LABEL org.opencontainers.image.title="synqloud-site" \
      org.opencontainers.image.description="Synqloud homepage served by unprivileged nginx"

USER root
RUN rm -rf /usr/share/nginx/html/*
USER 101

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
