import React, { useCallback, useEffect, useState } from "react"
import {
  AppState,
  Language,
  Configuration as ConfigurationType,
  AppTabs,
} from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  Menu,
  MenuItem,
  Modal,
  Select,
  SelectChangeEvent,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import {
  addLanguage,
  configuration,
  countPhrasesWithLocale,
  exportDb,
  importDb,
  knownLanguages,
  phraseSearch,
  removeLanguage,
  resetDatabase,
  setConfiguration,
} from "../util/database"
import { ConfirmationModal } from "./ConfirmationModal"
import AddIcon from "@mui/icons-material/Add"
import LanguageIcon from "@mui/icons-material/Language"
import DeleteIcon from "@mui/icons-material/Delete"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"
import ClearAll from "@mui/icons-material/ClearAll"
import FileDownload from "@mui/icons-material/FileDownload"
import FileUpload from "@mui/icons-material/FileUpload"
import { languageList } from "../util/languages"
import {
  defaultDistanceMetric,
  defaultMaxSimilarPhrases,
  DistanceMetric,
} from "../util/similarity_sorter"

type ConfigurationProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Configuration: React.FC<ConfigurationProps> = ({
  state,
  dispatch,
}) => {
  const [version, setVersion] = useState(0)
  const { config } = state
  useEffect(() => {
    configuration()
      .then((c) => {
        dispatch({ action: "config", config: c ?? {} })
      })
      .catch(errorHandler(dispatch))
  }, [])
  const maxSimilarPhrasesHandler = useCallback((e) => {
    const c: ConfigurationType = {
      ...config,
    }
    c.maxSimilarPhrases = Number.parseInt(e.target.value)
    setConfiguration(c)
      .then(() => {
        dispatch({ action: "config", config: c })
      })
      .catch(errorHandler(dispatch))
  }, [])
  const distanceMetricHandler = useCallback((e: SelectChangeEvent) => {
    const c: ConfigurationType = {
      ...config,
    }
    c.distanceMetric = e.target.value as DistanceMetric
    setConfiguration(c)
      .then(() => {
        dispatch({ action: "config", config: c })
      })
      .catch(errorHandler(dispatch))
  }, [])
  return (
    <>
      <Stack
        direction="row"
        spacing={2}
        sx={{ justifyContent: "space-between", alignItems: "end" }}
      >
        <Typography variant="h5" component="h1">
          Configuration
        </Typography>
        <Link
          sx={{ cursor: "pointer" }}
          onClick={async () => {
            let [tab] = await chrome.tabs.query({
              active: true,
              lastFocusedWindow: true,
            })
            if (tab === undefined) {
              // try a different query
              const tabs = await chrome.tabs.query({
                active: true,
                currentWindow: true,
              })
              if (tabs.length === 1) tab = tabs[0]
            }
            if (tab?.id) {
              chrome.tabs.sendMessage(tab.id, {
                action: "help",
              })
            }
          }}
        >
          <Tooltip title="go to the Amanuensis documentation">
            <HelpOutlineIcon />
          </Tooltip>
        </Link>
      </Stack>
      <Stack spacing={2} sx={{ alignItems: "flex-start", mt: 3 }}>
        <FormControl fullWidth>
          <InputLabel id="metric-select-label">
            String Distance Metric
          </InputLabel>
          <Select
            labelId="metric-select-label"
            id="thing-select"
            value={config?.distanceMetric ?? defaultDistanceMetric}
            label="String Distance Metric"
            onChange={distanceMetricHandler}
          >
            {Object.values(DistanceMetric).map((metric) => (
              <MenuItem key={metric} value={metric}>
                {metric}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Max Similar Phrases"
          type="number"
          fullWidth
          slotProps={{ htmlInput: { min: 5, step: 1 } }}
          value={state.config?.maxSimilarPhrases ?? defaultMaxSimilarPhrases}
          onChange={maxSimilarPhrasesHandler}
        />
        <DbActions
          dispatch={dispatch}
          version={version}
          setVersion={setVersion}
        />
        <Languages
          dispatch={dispatch}
          version={version}
          setVersion={setVersion}
        />
      </Stack>
    </>
  )
}

type LanguagesProps = {
  dispatch: React.Dispatch<Action>
  version: number
  setVersion: (version: number) => void
}
/** lists and allows the editing of languages */
export const Languages: React.FC<LanguagesProps> = ({
  dispatch,
  version,
  setVersion,
}) => {
  const [languages, setLanguages] = useState<Language[]>([])
  useEffect(() => {
    knownLanguages()
      .then((langs) => {
        setLanguages(langs)
      })
      .catch(errorHandler(dispatch))
  }, [version])
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const languageMenuOpen = Boolean(languageMenuAnchorEl)
  const [openAddLanguageModal, setOpenAddLanguageModal] = React.useState(false)
  const [languageToRemove, setLanguageToRemove] = React.useState<
    Language | undefined
  >()
  const [name, setName] = React.useState<string | undefined>()
  const [locale, setLocale] = React.useState<string | undefined>()
  const createLanguage = (languageName, locale) => () => {
    countPhrasesWithLocale(locale)
      .then((c) => {
        if (c === 0) {
          addLanguage(languageName, locale, false)
            .then(() => setVersion(version + 1))
            .catch(errorHandler(dispatch))
        } else {
          setName(languageName)
          setLocale(locale)
          setOpenAddLanguageModal(true)
        }
      })
      .catch(errorHandler(dispatch))
    setLanguageMenuAnchorEl(null)
  }
  const deleteLanguage = (language: Language) => () => {
    if (language.count) {
      setLanguageToRemove(language)
    } else {
      removeLanguage(language, false).then(() => setVersion(version + 1))
    }
  }
  return (
    <>
      <Stack
        direction="row"
        spacing={2}
        sx={{ justifyContent: "space-between", width: "100%" }}
      >
        <Typography variant="h6" component="h2">
          Languages{" "}
          <Tooltip
            arrow
            title="You may categorize notes by language. Notes within the same language may be merged. Within a language there may be only one note per lemma."
          >
            <LanguageIcon fontSize="small" />
          </Tooltip>
        </Typography>
        <IconButton
          color="primary"
          size="small"
          onClick={(e) => setLanguageMenuAnchorEl(e.currentTarget)}
        >
          <AddIcon fontSize="small" />
        </IconButton>
        <Menu
          MenuListProps={{ dense: true }}
          anchorEl={languageMenuAnchorEl}
          open={languageMenuOpen}
          onClose={() => setLanguageMenuAnchorEl(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault()
              setLanguageMenuAnchorEl(null)
            }
          }}
        >
          {Object.entries(languageList)
            .filter(
              ([_k, v]) => !languages.some((l: Language) => l.locale === v)
            )
            .map(([k, v]) => (
              <MenuItem key={v} onClick={createLanguage(k, v)}>
                {k}
              </MenuItem>
            ))}
        </Menu>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ verticalAlign: "bottom" }}>Name</TableCell>
            <TableCell sx={{ verticalAlign: "bottom" }}>
              Expected Locale
            </TableCell>
            <TableCell sx={{ verticalAlign: "bottom" }}>Locales</TableCell>
            <TableCell sx={{ verticalAlign: "bottom" }}>Phrases</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {languages.map((l) => (
            <TableRow key={l.id}>
              <TableCell>
                <Link
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    const langs = [l.id!]
                    phraseSearch({ languages: langs })
                      .then((searchResults) => {
                        dispatch({
                          action: "search",
                          search: { languages: langs },
                          searchResults,
                          tab: AppTabs.Dictionary,
                        })
                      })
                      .catch(errorHandler(dispatch))
                  }}
                >
                  {l.name}
                </Link>
              </TableCell>
              <TableCell>{l.locale ?? <i>none assigned</i>}</TableCell>
              <TableCell>
                {Object.entries(l.locales).map(([k, v], i) => (
                  <span key={i}>
                    <b>{k}</b> {v}{" "}
                  </span>
                ))}
              </TableCell>
              <TableCell align="right">{l.count.toLocaleString()}</TableCell>
              <TableCell>
                {!!l.id && (
                  <IconButton
                    color={l.count ? "warning" : "primary"}
                    size="small"
                    onClick={deleteLanguage(l)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AddLanguageModal
        open={openAddLanguageModal}
        setOpen={setOpenAddLanguageModal}
        name={name}
        locale={locale}
        version={version}
        setVersion={setVersion}
        dispatch={dispatch}
      />
      <RemoveLanguageModal
        language={languageToRemove}
        setLanguage={setLanguageToRemove}
        version={version}
        setVersion={setVersion}
        dispatch={dispatch}
      />
    </>
  )
}

type AddLanguageModalProps = {
  open: boolean
  setOpen: (open: boolean) => void
  version: number
  setVersion: (version: number) => void
  name?: string
  locale?: string
  dispatch: React.Dispatch<Action>
}
const AddLanguageModal: React.FC<AddLanguageModalProps> = ({
  open,
  setOpen,
  version,
  setVersion,
  name,
  locale,
  dispatch,
}) => {
  open = open && !!(name && locale) // precaution
  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            setOpen(false)
          }
        }}
      >
        <Typography id="modal-modal-title" variant="h6" component="h2">
          {`Add ${name} to Languages`}
        </Typography>
        <Typography id="modal-modal-description" sx={{ m: 2 }}>
          {`Notes all of whose citations use this language's locale, "${locale}", exist. Do you want to move all of these to the new language?`}
        </Typography>
        <Stack
          spacing={2}
          direction="row"
          sx={{
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setOpen(false)
              addLanguage(name!, locale!, true)
                .then(() => setVersion(version + 1))
                .catch(errorHandler(dispatch))
            }}
          >
            Move
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setOpen(false)
              addLanguage(name!, locale!, false)
                .then(() => setVersion(version + 1))
                .catch(errorHandler(dispatch))
            }}
          >
            Leave
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </Stack>
      </Box>
    </Modal>
  )
}

type RemoveLanguageModalProps = {
  language?: Language
  setLanguage: (language?: Language) => void
  version: number
  setVersion: (version: number) => void
  dispatch: React.Dispatch<Action>
}
const RemoveLanguageModal: React.FC<RemoveLanguageModalProps> = ({
  language,
  setLanguage,
  version,
  setVersion,
  dispatch,
}) => {
  return (
    <Modal
      open={!!language}
      onClose={() => setLanguage(undefined)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault()
          setLanguage(undefined)
        }
      }}
    >
      <Box>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          {`Add ${name} to Languages`}
        </Typography>
        <Typography id="modal-modal-description" sx={{ m: 2 }}>
          {`Notes have already been assigned to this language. Do you want to move all of these to the unknown language or delete them?`}
        </Typography>
        <Stack
          spacing={2}
          direction="row"
          sx={{
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setLanguage(undefined)
              removeLanguage(language!, true)
                .then(() => setVersion(version + 1))
                .catch(errorHandler(dispatch))
            }}
          >
            Move
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setLanguage(undefined)
              removeLanguage(language!, false)
                .then(() => setVersion(version + 1))
                .catch(errorHandler(dispatch))
            }}
          >
            Delete
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setLanguage(undefined)}
          >
            Cancel
          </Button>
        </Stack>
      </Box>
    </Modal>
  )
}

type DbActionProps = {
  version: number
  setVersion: (version: number) => void
  dispatch: React.Dispatch<Action>
}

export const DbActions: React.FC<DbActionProps> = ({
  version,
  setVersion,
  dispatch,
}) => {
  const [clearDbModalOpen, setClearDbModalOpen] = useState(false)
  const [openImportDbModal, setOpenImportDbModal] = React.useState(false)
  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        sx={{ width: "100%", justifyContent: "space-between" }}
      >
        <Tooltip arrow title="clear the database">
          <Button
            onClick={() => setClearDbModalOpen(true)}
            endIcon={<ClearAll />}
          >
            Clear
          </Button>
        </Tooltip>
        <Tooltip arrow title="export database to a file">
          <Button
            endIcon={<FileDownload />}
            onClick={async () => {
              const data = await exportDb()
              const a = document.createElement("a")
              a.href = URL.createObjectURL(
                new Blob([data], {
                  type: "application/json",
                })
              )
              a.download = `amanuensis-${new Date()
                .toLocaleDateString()
                .replaceAll("/", "-")}.json`
              a.click()
            }}
          >
            Export
          </Button>
        </Tooltip>
        <Tooltip
          arrow
          title="import database from file, merging it into the current database"
        >
          <Button
            endIcon={<FileUpload />}
            onClick={() => setOpenImportDbModal(true)}
          >
            Import
          </Button>
        </Tooltip>
      </Stack>
      <ConfirmationModal
        open={clearDbModalOpen}
        title="Remove All Records from Database"
        okHandler={() => {
          resetDatabase()
            .then(() => {
              setVersion(version + 1)
              dispatch({ action: "phrasesDeleted" })
            })
            .catch(errorHandler(dispatch))
        }}
        setOpen={setClearDbModalOpen}
      >
        This will permanently delete everything thing you have saved in the
        database.
      </ConfirmationModal>
      <ImportDbModal
        open={openImportDbModal}
        setOpen={setOpenImportDbModal}
        version={version}
        setVersion={setVersion}
        dispatch={dispatch}
      />
    </>
  )
}

type ImportDbModalProps = {
  open: boolean
  setOpen: (open: boolean) => void
  version: number
  setVersion: (version: number) => void
  dispatch: React.Dispatch<Action>
}
const ImportDbModal: React.FC<ImportDbModalProps> = ({
  open,
  setOpen,
  version,
  setVersion,
  dispatch,
}) => {
  const [file, setFile] = React.useState<File>()
  const [dropText, setDropText] = React.useState("Click or drop file here")
  const hiddenFilePicker = React.useRef<HTMLInputElement>(null)
  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            setOpen(false)
          }
        }}
      >
        <Typography id="modal-modal-title" variant="h6" component="h2">
          {`Import an exported database`}
        </Typography>
        <Typography id="modal-modal-description" sx={{ m: 2 }}>
          {`This will import everything from the chosen database file into the working database. You may find that this results in duplicate notes and tags. You will have to merge or delete these manually.`}
        </Typography>
        <Stack
          alignContent="center"
          alignItems="center"
          sx={{
            width: "100%",
            margin: 1,
            marginBottom: 2,
            border: "2px dotted #bbb",
            borderRadius: "10px",
            padding: 1,
            color: "#bbb",
            cursor: "pointer",
          }}
          onDragOver={(e) => {
            e.stopPropagation()
            e.preventDefault()
            e.dataTransfer.dropEffect = "copy"
          }}
          onDrop={async (e) => {
            e.stopPropagation()
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            try {
              if (!file) throw new Error(`Only files can be dropped here`)
              setDropText(`${file.name}`)
              setFile(file)
            } catch (error) {
              console.error("" + error)
            }
          }}
          onClick={(e) => {
            hiddenFilePicker.current?.click()
          }}
        >
          {dropText}
          <input
            type="file"
            style={{ display: "none" }}
            ref={hiddenFilePicker}
            accept="application/json"
            onChange={(e) => {
              const file = e.target.files![0]
              setDropText(file.name)
              setFile(file)
            }}
          />
        </Stack>
        <Stack
          spacing={2}
          direction="row"
          sx={{
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          <Button
            endIcon={<FileUpload />}
            variant="outlined"
            color="primary"
            disabled={file == null}
            onClick={() => {
              importDb(file!, (total, completed) =>
                console.log(`completed ${completed} of ${total}`)
              )
                .then(() => {
                  dispatch({
                    action: "message",
                    message: `imported all data from ${file?.name}`,
                  })
                  setVersion(version + 1)
                  setOpen(false)
                })
                .catch(errorHandler(dispatch))
            }}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </Stack>
      </Box>
    </Modal>
  )
}
