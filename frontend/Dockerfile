FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

# Dev server (HMR). For production use `npm run build` + `npm run start`.
CMD ["npm", "run", "dev", "--", "-p", "3000", "-H", "0.0.0.0"]
