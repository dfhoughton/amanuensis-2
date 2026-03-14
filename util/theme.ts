import type { } from "@mui/lab/themeAugmentation"
import { createTheme } from "@mui/material"
import { alpha } from "@mui/material/styles"

const oxBlood = "#931f1d"
// some high-contrast colors borrowed from the Olympic ring logo
const olympicBlue = "#0078D0"
const olympicYellow = "#FFB114"
const olympicGreen = "#00A651"
const olympicRed = "#F0282D"

declare module "@mui/material/styles" {
  interface Palette {
    tetrad1: Palette["primary"]
    tetrad2: Palette["primary"]
    tetrad3: Palette["primary"]
    tetrad4: Palette["primary"]
  }

  interface PaletteOptions {
    tetrad1?: PaletteOptions["primary"]
    tetrad2?: PaletteOptions["primary"]
    tetrad3?: PaletteOptions["primary"]
    tetrad4?: PaletteOptions["primary"]
  }
}

let t = createTheme({
  palette: {
    primary: {
      main: oxBlood,
      light: alpha(oxBlood, 0.1),
    },
    secondary: {
      main: "rgb(80 116 235)",
      contrastText: "#fff",
    },
  },
  typography: {
    fontFamily: "Helvetica",
  },
  components: {
    MuiTabPanel: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.unstable_sx({
            p: 2, // make things a bit more compact
          }),
      },
    },
    MuiModal: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.unstable_sx({
            "> .MuiBox-root, > .MuiStack-root": {
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 350,
              bgcolor: "background.paper",
              boxShadow: 24,
              pt: 2,
              px: 4,
              pb: 3,
            },
          }),
      },
    },
    MuiChip: {
      styleOverrides: {
        clickable: ({ theme }) =>
          theme.unstable_sx({
            ":hover": {
              color: theme.palette.secondary.main,
              "& > svg": {
                color: theme.palette.secondary.main,
              },
            },
          }),
      },
    },
  },
})

// add four high-contrast colors
t = createTheme(t, {
  // Custom colors created with augmentColor go here
  palette: {
    tetrad1: t.palette.augmentColor({
      color: {
        main: olympicBlue,
      },
      name: "tetrad1",
    }),
    tetrad2: t.palette.augmentColor({
      color: {
        main: olympicYellow,
      },
      name: "tetrad2",
    }),
    tetrad3: t.palette.augmentColor({
      color: {
        main: olympicGreen,
      },
      name: "tetrad3",
    }),
    tetrad4: t.palette.augmentColor({
      color: {
        main: olympicRed,
      },
      name: "tetrad4",
    }),
  },
})

export const theme = t
