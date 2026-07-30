# Lightweight scheduler sidecar — curl + crond baked at build time (no runtime apk install).
FROM alpine:3.20

RUN apk add --no-cache curl tzdata

WORKDIR /cron
COPY run-host-payouts.sh run-timed-matches.sh host-payouts.crontab ./
RUN chmod +x /cron/run-host-payouts.sh /cron/run-timed-matches.sh && crontab /cron/host-payouts.crontab

ENV TZ=Asia/Jakarta
ENV APP_INTERNAL_URL=http://app:3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD pidof crond >/dev/null || exit 1

CMD ["crond", "-f", "-l", "8"]
