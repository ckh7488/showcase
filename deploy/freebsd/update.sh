#!/bin/sh
# Run with FreeBSD /bin/sh; no Bash or Node.js required.
set -eu
SCRIPT_DIR=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
exec "${PYTHON:-python3}" "$SCRIPT_DIR/update.py" "$@"
