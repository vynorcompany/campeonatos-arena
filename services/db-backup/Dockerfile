FROM postgres:18-alpine

RUN apk add --no-cache aws-cli

COPY backup.sh /backup.sh
COPY restore-test.sh /restore-test.sh
COPY restore-drill.sh /restore-drill.sh
COPY restore-runtime-privileges.sql /restore-runtime-privileges.sql
RUN chmod +x /backup.sh /restore-test.sh /restore-drill.sh

CMD ["/backup.sh"]
