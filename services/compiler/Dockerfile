FROM node:22-bookworm-slim AS build

WORKDIR /service
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM debian:bookworm-slim AS tectonic

ARG TECTONIC_VERSION=0.15.0
ARG TARGETARCH
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && case "$TARGETARCH" in \
         amd64) TECTONIC_ARCH=x86_64; TECTONIC_SHA256=dfb82876f2986862996e564fa507a9e576e0c1e3bee63c2c1bd677c2543e6407 ;; \
         arm64) TECTONIC_ARCH=aarch64; TECTONIC_SHA256=1f59f9fb8eb65e8ba18658fc9016767e7d3e12488ded8b8fffa34254e51ce42c ;; \
         *) echo "Unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
       esac \
    && curl --proto '=https' --tlsv1.2 --fail --silent --show-error --location \
      "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%40${TECTONIC_VERSION}/tectonic-${TECTONIC_VERSION}-${TECTONIC_ARCH}-unknown-linux-musl.tar.gz" \
      --output /tmp/tectonic.tar.gz \
    && echo "${TECTONIC_SHA256}  /tmp/tectonic.tar.gz" | sha256sum --check --strict \
    && tar -xzf /tmp/tectonic.tar.gz -C /usr/local/bin tectonic \
    && chmod 0755 /usr/local/bin/tectonic \
    && rm -rf /var/lib/apt/lists/* /tmp/tectonic.tar.gz

COPY assets/warmup.tex /tmp/warmup.tex
RUN mkdir -p /opt/tectonic-cache /tmp/tectonic-config \
    && XDG_CACHE_HOME=/opt/tectonic-cache XDG_CONFIG_HOME=/tmp/tectonic-config \
      /usr/local/bin/tectonic --untrusted --outdir /tmp /tmp/warmup.tex \
    && rm -rf /tmp/warmup.* /tmp/tectonic-config

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=8080 \
    TECTONIC_UNTRUSTED_MODE=1 \
    TECTONIC_BINARY=/usr/local/bin/tectonic \
    TECTONIC_VERSION=0.15.0 \
    PACKAGE_BUNDLE_VERSION=tectonic-default-v1 \
    COMPILER_CACHE_DIR=/cache \
    XDG_CACHE_HOME=/opt/tectonic-cache

RUN useradd --system --uid 10001 --create-home --home-dir /home/compiler compiler \
    && mkdir -p /service /cache \
    && chown -R compiler:compiler /service /cache

COPY --from=tectonic /usr/local/bin/tectonic /usr/local/bin/tectonic
COPY --from=tectonic /opt/tectonic-cache /opt/tectonic-cache
COPY --from=build --chown=compiler:compiler /service/dist /service/dist
COPY --from=build --chown=compiler:compiler /service/package.json /service/package.json
COPY --from=build --chown=compiler:compiler /service/node_modules /service/node_modules

USER compiler
WORKDIR /service
EXPOSE 8080
CMD ["node", "dist/server.js"]
