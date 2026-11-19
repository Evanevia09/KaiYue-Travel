#!/usr/bin/env bash
# Secret-free Cloud Agent bootstrap. Pins Node linux-x64 and pnpm, then
# installs workspace dependencies from the lockfile. Does not start
# wrangler, preview, hosted Workers, D1, mail, or any shared service.
set -euo pipefail

NODE_VERSION="22.23.5"
# SHA256 from https://nodejs.org/dist/v22.23.5/SHASUMS256.txt
# line: node-v22.23.5-linux-x64.tar.xz
NODE_SHA256="cdeb8670a0c81f51b4dc4ac61919f9b1ad917b304bf8221eb939570663d240f8"
PNPM_VERSION="10.15.0"
NODE_DIST="node-v${NODE_VERSION}-linux-x64.tar.xz"
NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_DIST}"
NODE_PREFIX="/usr/local"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

export PATH="${NODE_PREFIX}/bin:${PATH}"
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
  echo "install.sh pins Node ${NODE_VERSION} linux-x64 only (got $(uname -s) $(uname -m))." >&2
  exit 1
fi

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

if ! need_cmd curl || ! need_cmd tar || ! need_cmd sha256sum; then
  echo "install.sh requires curl, tar, and sha256sum on PATH." >&2
  exit 1
fi

if [[ -x "${NODE_PREFIX}/bin/node" && "$("${NODE_PREFIX}/bin/node" -v)" == "v${NODE_VERSION}" ]]; then
  echo "Node v${NODE_VERSION} already installed at ${NODE_PREFIX}."
else
  tmp="$(mktemp -d)"
  trap 'rm -rf "${tmp}"' EXIT
  echo "Downloading ${NODE_DIST}"
  curl -fsSL "${NODE_URL}" -o "${tmp}/${NODE_DIST}"
  printf '%s  %s\n' "${NODE_SHA256}" "${tmp}/${NODE_DIST}" | sha256sum -c -
  run_root tar -xJf "${tmp}/${NODE_DIST}" -C "${NODE_PREFIX}" --strip-components=1 --no-same-owner
  rm -rf "${tmp}"
  trap - EXIT
  hash -r
fi

if [[ ! -x "${NODE_PREFIX}/bin/node" ]]; then
  echo "Node binary missing at ${NODE_PREFIX}/bin/node after install." >&2
  exit 1
fi

if [[ "$("${NODE_PREFIX}/bin/node" -v)" != "v${NODE_VERSION}" ]]; then
  echo "Expected Node v${NODE_VERSION}, got $("${NODE_PREFIX}/bin/node" -v)." >&2
  exit 1
fi

if [[ -x "${NODE_PREFIX}/bin/pnpm" && "$("${NODE_PREFIX}/bin/pnpm" --version)" == "${PNPM_VERSION}" ]]; then
  echo "pnpm ${PNPM_VERSION} already installed at ${NODE_PREFIX}."
else
  run_root "${NODE_PREFIX}/bin/corepack" enable
  run_root "${NODE_PREFIX}/bin/corepack" prepare "pnpm@${PNPM_VERSION}" --activate
  hash -r
fi

if [[ ! -x "${NODE_PREFIX}/bin/pnpm" ]]; then
  echo "pnpm missing at ${NODE_PREFIX}/bin/pnpm after Corepack prepare." >&2
  exit 1
fi

if [[ "$("${NODE_PREFIX}/bin/pnpm" --version)" != "${PNPM_VERSION}" ]]; then
  echo "Expected pnpm ${PNPM_VERSION}, got $("${NODE_PREFIX}/bin/pnpm" --version)." >&2
  exit 1
fi

"${NODE_PREFIX}/bin/pnpm" install --frozen-lockfile
