export default {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ESNext",
          module: "ESNext",
          moduleResolution: "node",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          noEmit: true,
          isolatedModules: true,
          rootDir: ".",
          ignoreDeprecations: "6.0",
        },
      },
    ],
  },
}
