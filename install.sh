#!/usr/bin/env bash
set -euo pipefail

REPO="s9swata/joyboy"
VERSION="v1.0.1"
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

  local dirname="joyboy-1.0.1"
  tar xzf "${tmpdir}/joyboy.tar.gz" -C "${tmpdir}"

  rm -rf "${SHARED}"
  cp -R "${tmpdir}/${dirname}" "${SHARED}"

  cd "${SHARED}"
  node -e '
    const p = require("fs").readFileSync("package.json","utf8");
    require("fs").writeFileSync("package.json", p.replace(/"joyboy":\s*"link:.*",?\n?/, ""));
  '
  if ! npm install; then
    echo ""
    echo "npm install failed. Make sure Node.js and npm are installed:"
    echo "  https://nodejs.org/"
    exit 1
  fi

  ln -sf "${SHARED}/bin/joyboy.js" "${BINDIR}/joyboy"
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

detect_players() {
  echo ""
  echo "Detecting video players..."
  local found=0

  if command -v mpv >/dev/null 2>&1; then
    echo "  ✓ mpv         found"
    found=1
  else
    echo "  ✗ mpv         not found"
  fi

  if command -v vlc >/dev/null 2>&1; then
    echo "  ✓ VLC         found"
    found=1
  else
    echo "  ✗ VLC         not found"
  fi

  if [ "$(uname -s)" = "Darwin" ]; then
    if [ -d "/Applications/IINA.app" ]; then
      echo "  ✓ IINA        found"
      found=1
    else
      echo "  ✗ IINA        not found"
    fi
  else
    if command -v iina >/dev/null 2>&1; then
      echo "  ✓ IINA        found"
      found=1
    else
      echo "  ✗ IINA        not found"
    fi
  fi

  if [ "$found" -eq 0 ]; then
    echo ""
    echo "  No player found! Install one:"
    echo "    macOS: brew install mpv"
    echo "    Linux: sudo apt install mpv  (or pacman/dnf equivalent)"
    echo "    Any:   https://mpv.io/"
  fi
}

print_done() {
  detect_players
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
  echo "Set ANIME_PLAYER env var to override:  export ANIME_PLAYER=mpv"
  echo "Or press 's' in the app to switch players at any time."
}

main
