import type { Preview } from '@storybook/react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from '../util/theme'

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ padding: '16px', maxWidth: '500px' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    actions: { argTypesRegex: '^on.*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
