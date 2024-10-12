import { Box, Button } from "@mui/material"
import React from "react"
import { AppState } from "../types/common"
import { Action } from "../util/provisional_reducer"

type ConfigurationProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Configuration: React.FC<ConfigurationProps> = ({ state, dispatch }) => {
  return (
    <>
      This will eventually be extension configuration
    </>
  )
}
