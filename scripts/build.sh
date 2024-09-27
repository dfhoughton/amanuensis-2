#!/bin/sh

echo 'building extension...'

rm -rf dist/*
mkdir -p dist/images

cp manifest.json dist/
cp assets/* dist/
cp popup.html dist/
cp images/* dist/images/
esbuild content.ts --bundle $BUILD_ARG --outfile=dist/content.js
esbuild background.ts --bundle $BUILD_ARG --outfile=dist/background.js
esbuild foreground.tsx --bundle $BUILD_ARG --outfile=dist/foreground.js

echo 'done'

# esbuild app/javascript/*.* --bundle --sourcemap --minify --outdir=app/assets/builds

# cp -r build/* dist

# mv dist/index.html dist/popup.html
# cp src/background.js dist/
# cp src/content.js dist/
