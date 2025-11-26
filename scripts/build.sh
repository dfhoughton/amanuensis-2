#!/bin/sh

echo 'building extension...'

rm -rf dist/*
mkdir -p dist/images

cp manifest.json dist/
# Only copy assets if they exist
if [ -n "$(ls -A assets 2>/dev/null)" ]; then
  cp assets/* dist/
fi
cp popup.html dist/
cp images/* dist/images/

# Use the esbuild config with React Compiler integration
node scripts/esbuild.config.mjs

echo 'done'

# Old esbuild commands (replaced by config file):
# esbuild content.ts --bundle $BUILD_ARG --outfile=dist/content.js --target=$TARGET
# esbuild background.ts --bundle $BUILD_ARG --outfile=dist/background.js --target=$TARGET
# esbuild foreground.tsx --bundle $BUILD_ARG --outfile=dist/foreground.js --target=$TARGET
