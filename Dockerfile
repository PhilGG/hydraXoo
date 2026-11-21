# Development image for hydraXoo.
# Everything needed to test and lint the integration lives here,
# so nothing has to be installed on the host machine.
FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# Some Home Assistant dependencies may need compiling on arm64.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY requirements_test.txt /tmp/requirements_test.txt
RUN pip install -r /tmp/requirements_test.txt

CMD ["bash"]
