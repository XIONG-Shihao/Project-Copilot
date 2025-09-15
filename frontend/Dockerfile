# Stage: install & run CRA dev server
FROM node:24-alpine

WORKDIR /app

# 1. Install deps
COPY package.json package-lock.json ./
RUN npm install

# 2. Copy source
COPY . .

# 3. Expose CRA's default port
EXPOSE 3000

# 4. Start the dev server
CMD ["npm", "start"] 