FROM node:lts

# Workdir
WORKDIR /usr/app

# Copy and install packages
COPY . .
# Curl needed for healthcheck command
RUN apt-get -q update && \
    apt-get -y install curl poppler-data poppler-utils unrtf && \
    npm ci --ignore-scripts && npm cache clean --force

# Create temp folder for files to be stored whilst being converted
RUN mkdir ./src/temp/ && chown -R node ./src/temp/

# Node images provide 'node' unprivileged user to run apps and prevent
# privilege escalation attacks
USER node
CMD ["node", "."]