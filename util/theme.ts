import { createTheme } from "@mui/material"
import { alpha } from "@mui/material/styles"

const oxBlood = "#931f1d"
// a muted version of the primary color that we use for highlighting in a few places
export const bigRed = alpha(oxBlood, 0.1)

export const theme = createTheme({
  palette: {
    primary: {
      main: oxBlood,
    },
    secondary: {
      main: "#937b63",
    },
  },
  typography: {
    fontFamily: "Helvetica",
  },
  components: {
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
  },
})
