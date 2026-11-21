FROM nginxinc/nginx-unprivileged:stable-alpine
RUN sed -i 's|^[[:space:]]*pid[[:space:]].*;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js README.md API_GUIDE.md DEPLOY_AWS.md /usr/share/nginx/html/
COPY api-lab-github-pages-v2.zip /usr/share/nginx/html/
COPY postman/ /usr/share/nginx/html/postman/
EXPOSE 80
