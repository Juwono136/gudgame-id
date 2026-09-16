# Gud Game payout / timed-match scheduler sidecar.
# Runs on Docker network `tunnel` and calls the app via Docker DNS:
#   APP_INTERNAL_URL=http://app:3000
# (service name `app` → container `gudgame-app`)
#
# Lightweight: curl + crond baked at build time (no runtime apk install).
# DB restores are handled by Compose profile `restore` (postgres:18), not this image.
FROM alpine:3.20

LABEL org.opencontainers.image.title="gudgame-payout-cron" \
      org.opencontainers.image.description="Cron sidecar for Gud Game host payouts and timed matches"

RUN apk add --no-cache curl tzdata

WORKDIR /cron
COPY run-host-payouts.sh run-timed-matches.sh host-payouts.crontab ./
RUN chmod +x /cron/run-host-payouts.sh /cron/run-timed-matches.sh && crontab /cron/host-payouts.crontab

ENV TZ=Asia/Jakarta
ENV APP_INTERNAL_URL=http://app:3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD pidof crond >/dev/null || exit 1

CMD ["crond", "-f", "-l", "8"]
