import React, { useEffect, useState } from "react"
import {
  AppState,
  Language,
  Configuration as ConfigurationType,
} from "../types/common"
import { Action } from "../util/reducer"
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import {
  configuration,
  knownLanguages,
  resetDatabase,
  setConfiguration,
} from "../util/database"
import { ConfirmationModal } from "./ConfirmationModal"

type ConfigurationProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Configuration: React.FC<ConfigurationProps> = ({
  state,
  dispatch,
}) => {
  const [languages, setLanguages] = useState<[Language, number][]>([])
  const [clearDbModalOpen, setClearDbModalOpen] = useState(false)
  const [version, setVersion] = useState(0)
  const {config} = state;
  useEffect(() => {
    knownLanguages()
      .then((langs) => {
        setLanguages(langs)
      })
      .catch((e) => {
        dispatch({ action: "error", message: e.message })
      })
      configuration()
      .then((c) => {
        dispatch({ action: "config", config: c ?? {} })
      })
      .catch((e) => {
        dispatch({ action: "error", message: e.message })
      })
  }, [version])
  return (
    <>
      <Typography variant="h5" component="h1">
        Configuration
      </Typography>
      <Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!state?.config?.showHelp}
              onChange={(e) => {
                const c: ConfigurationType = {
                  ...config,
                }
                c.showHelp = e.target.checked
                setConfiguration(c).then(() => {
                  dispatch({ action: "config", config: c })
                }).catch((e) => {
                  dispatch({ action: "error", message: e.message })
                })
              }}
            />
          }
          label="Show Help Text"
        />
        <Button
          onClick={() => {
            dispatch({
              action: "error",
              message: "Hello, World! I'm an error!",
            })
          }}
        >
          Demonstrate Error State
        </Button>
        <Button onClick={() => setClearDbModalOpen(true)}>
          Clear Database
        </Button>
      </Box>
      <Box>
        <Typography variant="h6" component="h2">
          Languages
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Expected Locale</TableCell>
              <TableCell>Locales</TableCell>
              <TableCell>Phrases</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {languages.map(([l, c]) => (
              <TableRow key={l.id}>
                <TableCell>{l.name}</TableCell>
                <TableCell>{l.locale ?? <i>none assigned</i>}</TableCell>
                <TableCell>
                  {Object.entries(l.locales).map(([k, v], i) => (
                    <span key={i}>
                      <b>{k}</b> {v}{" "}
                    </span>
                  ))}
                </TableCell>
                <TableCell>{c.toLocaleString()}</TableCell>
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      <ConfirmationModal
        open={clearDbModalOpen}
        title="Remove All Records from Database"
        content="This will permanently delete everything thing you have saved in the database."
        okHandler={() => {
          resetDatabase()
            .then(() => {
              setVersion(version + 1)
            })
            .catch((e) => {
              dispatch({ action: "error", message: e.message })
            })
        }}
        setOpen={setClearDbModalOpen}
      />
    </>
  )
}
