import React, { ReactNode, useEffect, useState } from "react"
import {
  AppState,
  Language,
  Configuration as ConfigurationType,
  AppTabs,
  exhaustiveGuard,
} from "../types/common"
import { Action, errorHandler } from "../util/reducer"
import {
  Badge,
  Box,
  Button,
  IconButton,
  Link,
  Menu,
  MenuItem,
  Modal,
  Slider,
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
  defaultMaxSimilarPhrases,
  DistanceMetric,
} from "../util/similarity_sorter"
import { DEFAULT_AUTO_GRADUATE_COUNT } from "../util/spaced_repetition"
import { theme } from "../util/theme"
import { AutoStories, Quiz, Storage, SentimentSatisfiedAlt, SentimentVeryDissatisfied } from "@mui/icons-material"

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
  const maxSimilarPhrasesHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const c: ConfigurationType = {
      ...config,
    }
    const n = Number.parseInt(e.target.value)
    c.maxSimilarPhrases = n
    setConfiguration(c)
      .then(() => {
        dispatch({ action: "config", config: c })
      })
      .then(() => dispatch({ action: "maxSimilarPhrasesChanged", maxSimilarPhrases: n }))
      .catch(errorHandler(dispatch, "errored upon saving configuration change when setting max similar phrases"))
  }
  const autoGraduateHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const c: ConfigurationType = {
      ...config,
    }
    c.autoGraduateCount = Number.parseInt(e.target.value)
    setConfiguration(c)
      .then(() => {
        dispatch({ action: "config", config: c })
      })
      .catch(errorHandler(dispatch, "errored when saving auto-graduate count"))
  }
  const scalingFactorHandler = (_e: Event, value: number | number[]) => {
    const c: ConfigurationType = {
      ...config,
    }
    c.quizScalingFactor = value as number
    setConfiguration(c)
      .then(() => {
        dispatch({ action: "config", config: c })
      })
      .catch(errorHandler(dispatch, "errored when saving scaling factor"))
  }
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
                anchor: "configuration",
              })
            }
          }}
        >
          <Tooltip arrow title="go to the Amanuensis documentation concerning configuration">
            <HelpOutlineIcon />
          </Tooltip>
        </Link>
      </Stack>
      <Stack spacing={2} sx={{ alignItems: "flex-start", mt: 3 }}>
        <Typography variant="h6" component="h2" sx={{ pb: 1 }}>
          Dictionary
          <Tooltip arrow title="customize dictionary searches; see the Amanuensis documentation for more information">
            <AutoStories fontSize="small" sx={{ ml: 1, color: "gray" }} />
          </Tooltip>
        </Typography>
        <TextField
          label="Max Similar Phrases"
          type="number"
          fullWidth
          slotProps={{ htmlInput: { min: 5, step: 1 } }}
          value={state.config?.maxSimilarPhrases ?? defaultMaxSimilarPhrases}
          onChange={maxSimilarPhrasesHandler}
        />
        <Typography variant="h6" component="h2" sx={{ py: 1 }}>
          Quiz
          <Tooltip arrow title="customize spaced repetition quizzes; see the Amanuensis documentation for more information">
            <Quiz fontSize="small" sx={{ ml: 1, color: "gray" }} />
          </Tooltip>
        </Typography>
        <TextField
          label="Auto-graduate Count"
          type="number"
          fullWidth
          slotProps={{ htmlInput: { min: 3, max: 10, step: 1 } }}
          value={state.config?.autoGraduateCount ?? DEFAULT_AUTO_GRADUATE_COUNT}
          onChange={autoGraduateHandler}
        />
        <Box sx={{ width: "100%" }}>
          <Typography sx={{ mb: 1, fontSize: "smaller" }}>Memory Challenge</Typography>
          <Stack spacing={2} direction="row" sx={{ width: "100%", alignItems: "center" }}>
            <Tooltip arrow enterDelay={200} title="Minimal challenge. Your memory fades quickly. You will review phrases more often.">
              <SentimentSatisfiedAlt sx={{ color: "gray" }} />
            </Tooltip>
            <Slider
              aria-label="Quiz Scaling Factor"
              size="small"
              marks={[{ value: 1.0, label: "OK" }]}
              value={state.config?.quizScalingFactor ?? 1.0}
              min={0.1}
              max={1.9}
              step={0.05}
              onChange={scalingFactorHandler}
            />
            <Tooltip arrow enterDelay={200} title="Maximal challenge. Your memory is super-human. You will review phrases less often.">
              <SentimentVeryDissatisfied sx={{ color: "gray" }} />
            </Tooltip>
          </Stack>
        </Box>
        <Typography variant="h6" component="h2" sx={{ pt: 1 }}>
          Database
          <Tooltip arrow title="manage all your stored notes; see the Amanuensis documentation for more information">
            <Storage fontSize="small" sx={{ ml: 1, color: "gray" }} />
          </Tooltip>
        </Typography>
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
      .catch(errorHandler(dispatch, "errored when loading languages"))
  }, [version, dispatch])
  const [languageMenuAnchorEl, setLanguageMenuAnchorEl] =
    React.useState<null | HTMLElement>(null)
  const languageMenuOpen = Boolean(languageMenuAnchorEl)
  const [openAddLanguageModal, setOpenAddLanguageModal] = React.useState(false)
  const [languageToRemove, setLanguageToRemove] = React.useState<
    Language | undefined
  >()
  const [name, setName] = React.useState<string | undefined>()
  const [locale, setLocale] = React.useState<string | undefined>()
  const createLanguage = (languageName: string, locale: string) => () => {
    countPhrasesWithLocale(locale)
      .then((c) => {
        if (c === 0) {
          addLanguage(languageName, locale, false)
            .then(() => setVersion(version + 1))
            .catch(errorHandler(dispatch, "errored when adding language"))
        } else {
          setName(languageName)
          setLocale(locale)
          setOpenAddLanguageModal(true)
        }
      })
      .catch(errorHandler(dispatch, "errored when counting phrases for language"))
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
            <LanguageIcon fontSize="small" sx={{ ml: 1, color: "gray" }} />
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
          slotProps={{ list: { dense: true } }}
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
                      .catch(errorHandler(dispatch, "errored when initiating a language search"))
                  }}
                >
                  {l.name}
                </Link>
              </TableCell>
              <TableCell>{l.locale ?? <i>none assigned</i>}</TableCell>
              <TableCell>
                {Object.entries(l.locales).map(([k, v], i) => (
                  <span key={i}>
                    <b>{k}</b>&nbsp;{v.toLocaleString()}{" "}
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
                .catch(errorHandler(dispatch, "errored when adding language and moving notes to this language"))
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
                .catch(errorHandler(dispatch, "errored when adding language and leaving notes in their original language"))
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
                .catch(errorHandler(dispatch, "errored when removing language and moving notes to unknown language"))
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
                .catch(errorHandler(dispatch, "errored when removing language and deleting notes"))
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
            .catch(errorHandler(dispatch, "errored when clearing database"))
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
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            e.preventDefault()
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
              importDb(file!)
                .then(() => {
                  dispatch({
                    action: "message",
                    message: `imported all data from ${file?.name}`,
                  })
                  setVersion(version + 1)
                  setOpen(false)
                })
                .catch(errorHandler(dispatch, "errored when importing database"))
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

function metricColor(metric: DistanceMetric): string {
  switch (metric) {
    case DistanceMetric.ReverseJaroWinkler:
      return theme.palette.tetrad1.main
    case DistanceMetric.JaroWinkler:
      return theme.palette.tetrad2.main
    case DistanceMetric.LCS:
      return theme.palette.tetrad3.main
    case DistanceMetric.Lev:
      return theme.palette.tetrad4.main
    default:
      return exhaustiveGuard(metric)
  }
}

export const DistanceMetricDot: React.FC<{
  metric: DistanceMetric
  children?: ReactNode
}> = ({ metric, children }) => (
  <Badge
    variant="dot"
    sx={{
      "& .MuiBadge-badge": {
        backgroundColor: metricColor(metric),
      },
    }}
  >
    {children ?? metric}
  </Badge>
)
