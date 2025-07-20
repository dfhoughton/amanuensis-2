import type {} from "@mui/lab/themeAugmentation"
import { createTheme } from "@mui/material"
import { alpha } from "@mui/material/styles"

const oxBlood = "#931f1d"

export const theme = createTheme({
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
