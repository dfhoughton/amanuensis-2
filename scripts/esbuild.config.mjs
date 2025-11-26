/* eslint-disable no-undef */ // to silence warnings about console and process

import * as esbuild from 'esbuild'
import { transformAsync } from '@babel/core'
import reactCompiler from 'babel-plugin-react-compiler'
import * as fs from 'fs'

/**
 * esbuild plugin to integrate the React Compiler
 * This transforms React components using the React Compiler before bundling
 */
const reactCompilerPlugin = {
    name: 'react-compiler',
    setup(build) {
        // Only process .tsx and .jsx files
        build.onLoad({ filter: /\.(tsx|jsx)$/ }, async (args) => {
            const source = await fs.promises.readFile(args.path, 'utf8')

            try {
                const result = await transformAsync(source, {
                    filename: args.path,
                    plugins: [reactCompiler],
                    sourceMaps: true,
                })

                if (!result || !result.code) {
                    return { contents: source, loader: 'tsx' }
                }

                return {
                    contents: result.code,
                    loader: 'tsx',
                }
            } catch (error) {
                // If React Compiler fails, fall back to original source
                console.warn(`React Compiler failed for ${args.path}:`, error.message)
                return { contents: source, loader: 'tsx' }
            }
        })
    },
}

// Get build arguments from environment
const buildArg = process.env.BUILD_ARG || ''
const isMinify = buildArg.includes('--minify')
const isSourcemap = buildArg.includes('--sourcemap')
const target = 'es2024'

const commonConfig = {
    bundle: true,
    target,
    minify: isMinify,
    sourcemap: isSourcemap ? 'inline' : false,
    treeShaking: isMinify,
    plugins: [reactCompilerPlugin],
}

// Build all three entry points
async function build() {
    console.log('Building extension with React Compiler...')

    try {
        await Promise.all([
            esbuild.build({
                ...commonConfig,
                entryPoints: ['content.ts'],
                outfile: 'dist/content.js',
            }),
            esbuild.build({
                ...commonConfig,
                entryPoints: ['background.ts'],
                outfile: 'dist/background.js',
            }),
            esbuild.build({
                ...commonConfig,
                entryPoints: ['foreground.tsx'],
                outfile: 'dist/foreground.js',
            }),
        ])

        console.log('Build complete!')
    } catch (error) {
        console.error('Build failed:', error)
        process.exit(1)
    }
}

build()
