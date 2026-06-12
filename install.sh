#!/usr/bin/env bash
set -euo pipefail

REPO="s9swata/joyboy"
VERSION="v1.0.0"
TARBALL_URL="https://github.com/${REPO}/archive/${VERSION}.tar.gz"
SHARED="${HOME}/.local/share/joyboy"
BINDIR="${HOME}/.local/bin"

main() {
  case "$(uname -s)" in
    Darwin) install_macos ;;
    Linux)  install_linux ;;
    *)      echo "Unsupported OS: $(uname -s)"; exit 1 ;;
  esac
}

install_joyboy() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required. Install it first:"
    echo "  macOS (Homebrew): brew install node"
    echo "  Debian/Ubuntu:    sudo apt install nodejs npm"
    echo "  Arch:             sudo pacman -S nodejs npm"
    echo "  Fedora:           sudo dnf install nodejs npm"
    exit 1
  fi

  local tmpdir="$(mktemp -d)"
  trap "rm -rf ${tmpdir}" EXIT

  mkdir -p "${SHARED}" "${BINDIR}"

  echo "Downloading joyboy ${VERSION}..."
  curl -fsSL "${TARBALL_URL}" -o "${tmpdir}/joyboy.tar.gz"

  local dirname="joyboy-1.0.0"
  tar xzf "${tmpdir}/joyboy.tar.gz" -C "${tmpdir}"

  rm -rf "${SHARED}"
  cp -R "${tmpdir}/${dirname}" "${SHARED}"

  cd "${SHARED}"
  sed -i '/"joyboy":[[:space:]]*"link:/d' package.json
  npm install

  cat > "${BINDIR}/joyboy" << WRAPPER
#!/bin/bash
exec "\$(dirname "\$0")/../share/joyboy/node_modules/.bin/tsx" "\$(dirname "\$0")/../share/joyboy/src/index.tsx" "\$@"
WRAPPER
  chmod +x "${BINDIR}/joyboy"
}

install_macos() {
  if ! command -v brew >/dev/null 2>&1; then
    echo "Installing Homebrew (required for node)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "Installing node via Homebrew..."
    brew install node
  fi

  install_joyboy

  if [ ! -d "/Applications/IINA.app" ]; then
    echo "Installing IINA video player..."
    local dmg_url="https://github.com/iina/iina/releases/download/v1.4.3/IINA.v1.4.3.dmg"
    local tmp_dmg="$(mktemp).dmg"
    curl -fsSL "${dmg_url}" -o "${tmp_dmg}"
    hdiutil attach -quiet -nobrowse "${tmp_dmg}"
    cp -R "/Volumes/IINA/IINA.app" "/Applications/"
    hdiutil detach -quiet "/Volumes/IINA"
  fi

  print_done
}

install_linux() {
  install_joyboy
  print_done
}

print_done() {
  echo ""
  echo "joyboy installed to ${SHARED}"
  echo "The joyboy command is at ${BINDIR}/joyboy"
  echo ""
  if [[ ":$PATH:" != *":${BINDIR}:"* ]]; then
    echo "Add ${BINDIR} to your PATH:"
    echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc  (or ~/.zshrc)"
    echo "  source ~/.bashrc"
    echo ""
  fi
  if [ "$(uname -s)" = "Darwin" ]; then
    echo "IINA is the default player. To use a different player:"
  else
    echo "A video player is required. Install one via:"
    echo "  Debian/Ubuntu: sudo apt install mpv"
    echo "  Arch:          sudo pacman -S mpv"
    echo "  Fedora:        sudo dnf install mpv"
    echo ""
    echo "Then set it with:"
  fi
  echo "  export ANIME_PLAYER=mpv"
}

main
