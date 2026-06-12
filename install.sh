#!/usr/bin/env bash
set -euo pipefail

REPO="s9swata/joyboy"
VERSION="v1.0.0"
TARBALL_URL="https://github.com/${REPO}/archive/${VERSION}.tar.gz"

main() {
  case "$(uname -s)" in
    Darwin) install_macos ;;
    Linux)  install_linux ;;
    *)      echo "Unsupported OS: $(uname -s)"; exit 1 ;;
  esac
}

install_macos() {
  if ! command -v brew >/dev/null 2>&1; then
    echo "Installing Homebrew first..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
  brew install s9swata/joyboy
}

install_linux() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required. Install it first:"
    echo "  Debian/Ubuntu: sudo apt install nodejs npm"
    echo "  Arch:          sudo pacman -S nodejs npm"
    echo "  Fedora:        sudo dnf install nodejs npm"
    exit 1
  fi

  local shared="${HOME}/.local/share/joyboy"
  local bindir="${HOME}/.local/bin"
  local tmpdir="$(mktemp -d)"
  trap "rm -rf ${tmpdir}" EXIT

  mkdir -p "${shared}" "${bindir}"

  echo "Downloading joyboy ${VERSION}..."
  curl -fsSL "${TARBALL_URL}" -o "${tmpdir}/joyboy.tar.gz"

  local dirname="joyboy-1.0.0"
  tar xzf "${tmpdir}/joyboy.tar.gz" -C "${tmpdir}"

  rm -rf "${shared}"
  cp -R "${tmpdir}/${dirname}" "${shared}"

  cd "${shared}"
  sed -i '/"joyboy":[[:space:]]*"link:/d' package.json
  npm install

  cat > "${bindir}/joyboy" << WRAPPER
#!/bin/bash
exec "\$(dirname "\$0")/../share/joyboy/node_modules/.bin/tsx" "\$(dirname "\$0")/../share/joyboy/src/index.tsx" "\$@"
WRAPPER
  chmod +x "${bindir}/joyboy"

  echo ""
  echo "joyboy installed to ${shared}"
  echo "The joyboy command is at ${bindir}/joyboy"
  echo ""
  if [[ ":$PATH:" != *":${bindir}:"* ]]; then
    echo "Add ${bindir} to your PATH:"
    echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
    echo "  source ~/.bashrc"
    echo ""
  fi
  echo "A video player is required. Install one via:"
  echo "  Debian/Ubuntu: sudo apt install mpv"
  echo "  Arch:          sudo pacman -S mpv"
  echo "  Fedora:        sudo dnf install mpv"
  echo ""
  echo "Then set it with: export ANIME_PLAYER=mpv"
}

main
