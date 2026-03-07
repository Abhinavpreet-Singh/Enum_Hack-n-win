FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    g++ \
    gcc \
    python3 \
    nodejs \
    npm \
    coreutils

WORKDIR /app

COPY runner.sh /runner.sh
RUN chmod +x /runner.sh

ENTRYPOINT ["/runner.sh"]
