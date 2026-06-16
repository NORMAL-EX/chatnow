# Murmur — multi-stage, multi-arch image (frontend build + pure-Go backend).
#
#   docker build -t murmur .
#   docker compose up -d --build
#   docker buildx build --platform linux/amd64,linux/arm64 -t murmur .
#
# The frontend is built once on the native build platform; the Go binary is
# cross-compiled per target arch, so multi-arch builds stay fast.
#
# Building behind a TLS-intercepting proxy? Drop your proxy root CA (PEM, *.crt)
# into ./docker/certs/ and build normally (verification stays ON; empty = no-op).

# ---- Stage 1: build the frontend (always native) ----
FROM --platform=$BUILDPLATFORM node:22-alpine AS web
WORKDIR /web
COPY docker/certs/ /certs/
RUN touch /etc/ssl/certs/extra-ca.pem \
 && (cat /certs/*.crt >> /etc/ssl/certs/extra-ca.pem 2>/dev/null || true)
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/extra-ca.pem
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# ---- Stage 2: build the Go server (native toolchain, cross-compiled output) ----
FROM --platform=$BUILDPLATFORM golang:1.25-alpine AS server
WORKDIR /src
COPY docker/certs/ /certs/
RUN cat /certs/*.crt >> /etc/ssl/certs/ca-certificates.crt 2>/dev/null || true
ARG TARGETOS
ARG TARGETARCH
ENV CGO_ENABLED=0
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
RUN GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} go build -trimpath -ldflags "-s -w" -o /out/murmur .

# ---- Stage 3: minimal runtime (per target arch) ----
FROM alpine:3.20
COPY docker/certs/ /tmp/certs/
RUN cat /tmp/certs/*.crt >> /etc/ssl/certs/ca-certificates.crt 2>/dev/null || true \
 && apk add --no-cache ca-certificates tzdata \
 && (cp /tmp/certs/*.crt /usr/local/share/ca-certificates/ 2>/dev/null || true) \
 && update-ca-certificates 2>/dev/null || true \
 && rm -rf /tmp/certs \
 && adduser -D -u 10001 murmur
WORKDIR /app
COPY --from=server /out/murmur /app/murmur
COPY --from=web /web/dist /app/web/dist
ENV PORT=8080 \
    DB_PATH=/data/murmur.db \
    UPLOAD_DIR=/data/uploads
RUN mkdir -p /data && chown -R murmur /data /app
USER murmur
EXPOSE 8080
VOLUME ["/data"]
ENTRYPOINT ["/app/murmur"]
