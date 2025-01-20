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
  Checkbox,
  FormControl,
  FormControlLabel,
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
  knownLanguages,
  phraseSearch,
  removeLanguage,
  resetDatabase,
  setConfiguration,
} from "../util/database"
import { ConfirmationModal } from "./ConfirmationModal"
import { LabelWithHelp } from "./LabelWithHelp"
import AddIcon from "@mui/icons-material/Add"
import LanguageIcon from "@mui/icons-material/Language"
import DeleteIcon from "@mui/icons-material/Delete"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"
import AutoStories from "@mui/icons-material/AutoStories"
import MergeIcon from "@mui/icons-material/Merge"
import { languageList } from "../util/languages"
import {
  defaultDistanceMetric,
  defaultMaxSimilarPhrases,
  DistanceMetric,
} from "../util/similarity_sorter"
import { Mention } from "./Mention"

type ConfigurationProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const Configuration: React.FC<ConfigurationProps> = ({
  state,
  dispatch,
}) => {
  const [clearDbModalOpen, setClearDbModalOpen] = useState(false)
  const [version, setVersion] = useState(0)
  const { config } = state
  useEffect(() => {
    configuration()
      .then((c) => {
        dispatch({ action: "config", config: c ?? {} })
      })
      .catch(errorHandler(dispatch))
  }, [])
  const showHelpHandler = useCallback((e) => {
    const c: ConfigurationType = {
      ...config,
    }
    c.showHelp = e.target.checked
    setConfiguration(c)
      .then(() => {
        dispatch({ action: "config", config: c })
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
  const showingHelp = !!state?.config?.showHelp
  return (
    <>
      <Typography variant="h5" component="h1">
        Configuration
      </Typography>
      <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
        <LabelWithHelp
          hidden={!showingHelp}
          label=""
          explanation={
            <>
              To save space, Amanuensis leaves many interface elements
              unlabeled. Check this to add labels and, in most cases, further
              explanatory text. If there is explanatory text, there will be an
              information icon <HelpOutlineIcon fontSize="inherit" /> you can
              click to see it.
            </>
          }
        >
          <FormControlLabel
            control={
              <Checkbox checked={showingHelp} onChange={showHelpHandler} />
            }
            label="Show Help Text"
          />
        </LabelWithHelp>
        <LabelWithHelp
          hidden={!showingHelp}
          sx={{ width: "100%" }}
          label="Mechanism for Identifying Similar Phrases"
          explanation={
            <Stack spacing={1}>
              <Typography>
                If you capture a citation of <Mention phrase="cars" />, you
                probably don't want it to live in a separate note from a note on{" "}
                <Mention phrase="car" />, if any. You can add the citation to
                the existing <Mention phrase="car" /> by finding the note via
                search{" "}
                <Link
                  sx={{ cursor: "pointer" }}
                  onClick={() =>
                    dispatch({ action: "tab", tab: AppTabs.Dictionary })
                  }
                >
                  <AutoStories fontSize="inherit" />
                </Link>{" "}
                and then clicking the merge button{" "}
                <MergeIcon fontSize="inherit" />.
              </Typography>
              <Typography>
                But how do you find the <Mention phrase="car" /> note?
                Amanuensis provides a special variety of search for this
                purpose: the similarity search. Similarity searches look for
                notes whose lemma or citations are particularly similar to a
                given phrase. For this they need a definition of similarity.
                These are the string distance metrics.
              </Typography>
              <Typography>
                The default string distance metric is called{" "}
                {defaultDistanceMetric}. It is fast and considers changes to the
                beginning of words to be more important than changes to the end,
                so <Mention phrase="cars" /> will be found to be more similar
                than <Mention phrase="scar" /> to <Mention phrase="car" />. This
                is just what you want for suffixing languages like English,
                where grammatical markers tend to go on the end of words. If you
                are with with a prefixing language like Swahili, where{" "}
                <Mention phrase="watu" /> is a form of the word{" "}
                <Mention phrase="mtu" />, this is not so good.
              </Typography>
              <Typography>
                If you find the similar words found by similarity search are not
                all that similar, and in particular if you know that there's a
                similar note but it's not finding it, you could try a different
                string distance metric. Perhaps another will work better.
              </Typography>
            </Stack>
          }
        >
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
        </LabelWithHelp>
        <LabelWithHelp
          sx={{ width: "100%" }}
          hidden={!showingHelp}
          label="Maximum Phrases Found in Similarity Search"
          explanation={
            <Stack spacing={1}>
              <Typography>
                In a similarity search you are unlikely to find any interesting
                similar phrases after the first few notes, so rather than
                display all the notes in the dictionary for the given language
                sorted by similarity Amanuensis just shows the few most similar
                ones. This parameter controls how many are shown.
              </Typography>
            </Stack>
          }
        >
          <TextField
            label="Max Similar Phrases"
            type="number"
            fullWidth
            slotProps={{ htmlInput: { min: 5, step: 1 } }}
            value={state.config?.maxSimilarPhrases ?? defaultMaxSimilarPhrases}
            onChange={maxSimilarPhrasesHandler}
          />
        </LabelWithHelp>
        <LabelWithHelp
          hidden={!showingHelp}
          label=""
          explanation="Clicking this will remove all notes, tags, languages, and configuration."
        >
          <Button onClick={() => setClearDbModalOpen(true)}>
            Clear Database
          </Button>
        </LabelWithHelp>
        <Languages
          state={state}
          dispatch={dispatch}
          version={version}
          setVersion={setVersion}
        />
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
    </>
  )
}

type LanguagesProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
  version: number
  setVersion: (version: number) => void
}
/** lists and allows the editing of languages */
export const Languages: React.FC<LanguagesProps> = ({
  state,
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
      <Box>
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
