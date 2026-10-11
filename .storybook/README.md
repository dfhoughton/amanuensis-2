# Storybook for Amanuensis

Storybook is now configured for developing Amanuensis components in isolation.

## ✅ Key Feature: Zero Production Impact

**All Storybook dependencies are installed as `devDependencies`**, which means:
- ✅ They will NOT be included in the final extension bundle (`dist/` directory)
- ✅ They are only used during development
- ✅ The production build remains minimal and secure
- ✅ Vulnerability management is easier as production dependencies stay minimal

## 📦 What Was Added

### devDependencies
- `@storybook/react` - Core Storybook for React
- `@storybook/react-vite` - Vite builder for Storybook
- `@storybook/builder-vite` - Vite-based build system
- `@storybook/addon-essentials` - Core addons (controls, actions, docs)
- `@storybook/addon-links` - Link between stories
- `@storybook/addon-interactions` - Test user interactions
- `@storybook/blocks` - Documentation blocks
- `vite` - Fast build tool
- `@vitejs/plugin-react` - React plugin for Vite

### Files Created
- `.storybook/main.ts` - Storybook configuration
- `.storybook/preview.ts` - Global decorators and parameters
- `.storybook/README.md` - This file
- `.storybook/.storybookignore` - Files to ignore
- `components/TagChip.stories.tsx` - Example story
- `components/TagWidget.stories.tsx` - Example story

### Modified Files
- `package.json` - Added Storybook scripts and devDependencies
- `.gitignore` - Added `storybook-static/` to prevent committing build artifacts

## 🚀 Usage

### Starting Storybook

```bash
npm run storybook
```

This starts the Storybook server on `http://localhost:6006` and opens it in your browser.

### Building Storybook for static hosting

```bash
npm run storybook:build
```

This creates a `storybook-static` directory with a production-ready Storybook build.

### Serving a static build

```bash
npm run storybook:serve
```

This serves the static build on port 6006.

## 📝 Creating Stories

1. Create a file named `ComponentName.stories.tsx` alongside your component
2. Follow the pattern in `components/TagChip.stories.tsx`
3. Stories automatically appear in Storybook

### Example Story Structure

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { MyComponent } from './MyComponent'

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  argTypes: {
    // Define your props here
  },
}

export default meta

type Story = StoryObj<typeof MyComponent>

export const Default: Story = {
  args: {
    // Default props
  },
}

export const WithProps: Story = {
  args: {
    // Variant props
  },
}
```

## 🎨 Configuration Details

### `.storybook/main.ts`
- Configures Storybook to find stories in `components/**/*.stories.*`
- Uses Vite builder for fast compilation
- Auto-generates documentation (autodocs)

### `.storybook/preview.ts`
- Wraps all stories with MUI `ThemeProvider` and `CssBaseline`
- Applies consistent padding and max-width matching the extension UI (500px)
- Configures controls for colors and dates

## 🧪 Available Addons

- **Essentials**: Core controls, actions, and docs
- **Links**: Link between stories
- **Interactions**: Test user interactions

## 🏆 Best Practices

1. **Keep dependencies minimal**: Only add Storybook-specific dependencies to `devDependencies`
2. **Isolated development**: Use stories to develop and test components without the extension runtime
3. **Document props**: Use `argTypes` to document component props
4. **Multiple variants**: Create multiple stories for each component to show different states
5. **Type safety**: Use TypeScript for your stories

## 📝 Notes

- Storybook runs with React and Vite
- MUI theme is automatically applied to all stories
- The `storybook-static` directory is gitignored to avoid committing built files
- The extension's production build is completely unaffected by Storybook

## 🔍 Verification

The setup has been verified:
- ✅ Storybook starts successfully
- ✅ Stories are automatically discovered
- ✅ MUI theme is applied
- ✅ Production build still works (`npm run build`)
- ✅ No Storybook dependencies in production bundle
