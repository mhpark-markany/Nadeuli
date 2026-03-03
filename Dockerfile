FROM node:22-slim AS build
WORKDIR /app
COPY package.json yarn.lock tsconfig.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN yarn install --frozen-lockfile
COPY shared/ shared/
COPY backend/ backend/
RUN yarn workspace shared build && yarn workspace backend build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/package.json /app/yarn.lock ./
COPY --from=build /app/shared/package.json shared/
COPY --from=build /app/backend/package.json backend/
COPY --from=build /app/frontend/package.json frontend/
RUN yarn install --frozen-lockfile --production
COPY --from=build /app/shared/dist/ shared/dist/
COPY --from=build /app/backend/dist/ backend/dist/
EXPOSE 3000
CMD ["node", "backend/dist/index.js"]
