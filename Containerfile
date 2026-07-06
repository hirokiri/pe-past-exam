# ローカル開発・実行用コンテナ（Podman）
# 将来の Cloud Run デプロイでも同じイメージを使用する想定

FROM docker.io/oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM docker.io/oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# export 成果物が未生成でも runtime ステージの COPY が成功するようにする
RUN mkdir -p dist/export && bun run build

FROM docker.io/oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
# コンテンツはSSR時にファイルシステムから読み込む
COPY content ./content
# 事前生成済みの export 成果物（PDF/EPUB/HTML）をダウンロード配信用に含める
COPY --from=build /app/dist/export ./dist/export
EXPOSE 3000
CMD ["bun", "run", "start"]
