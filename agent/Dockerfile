FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY . .
RUN go build -o flux-radar-agent main.go

FROM alpine:3.22
WORKDIR /app
COPY --from=builder /app/flux-radar-agent .
ENTRYPOINT ["./flux-radar-agent"]