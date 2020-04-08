# Use LTS of Node
FROM node:12

# Set working directory
WORKDIR /src/svbh

# Copy data
COPY package*.json ./
RUN npm install
COPY . .

# Make sure these are the same as in config.js
EXPOSE 8080
EXPOSE 8443

CMD ["node", "app.js"]