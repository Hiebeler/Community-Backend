FROM node:19

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json /app/

RUN npm install -g pnpm
RUN pnpm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . /app

ENV DATABASE_URL ""

RUN npx prisma generate

EXPOSE 3000
CMD node src/app.js