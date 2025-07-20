import React, { useCallback, useEffect, useState } from "react"
import { AppState } from "../types/common"
import { Action, errorHandler, selectCitation } from "../util/reducer"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"
import {
  Box,
  Button,
  Divider,
  IconButton,
  Link,
  Skeleton,
  Stack,
  Tab,
  Tooltip,
  Typography,
} from "@mui/material"
import {
  DailyQuiz,
  describeTimeInterval,
  IntervalsForOutcomes,
  MAX_NEW_PHRASES_PER_QUIZ,
  NonInitialOutcome,
  OUTCOME_ORDER,
  PreparedTrial,
  Summary,
} from "../util/spaced_repetition"
import { useEnsureConfiguration } from "../hooks/configuration"
import TabContext from "@mui/lab/TabContext"
import TabList from "@mui/lab/TabList"
import TabPanel from "@mui/lab/TabPanel"
import { TagChip } from "./TagChip"
import { tagSearch } from "./Tags"
import { BigLanguageChip } from "./LanguageChip"
import {
  Celebration,
  Replay,
  SentimentNeutral,
  SentimentVeryDissatisfied,
  SentimentVerySatisfied,
} from "@mui/icons-material"
import Redo from "@mui/icons-material/Redo"

type QuizProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const SpacedRepetitionQuiz: React.FC<QuizProps> = ({
  state,
  dispatch,
}) => {
  // set up initial quiz state
  const [quiz, setQuiz] = useState<DailyQuiz>()
  const [version, setVersion] = useState(1)
  const bumpVersion = useCallback(() => setVersion(version + 1), [setVersion])
  useEnsureConfiguration(state, dispatch)
  useEffect(() => {
    if (state.config) {
      setQuiz(new DailyQuiz(state.config))
    }
  }, [state.config, version])
  return (
    <>
      {!!quiz && (
        <QuizTabs
          quiz={quiz!}
          state={state}
          dispatch={dispatch}
          bumpVersion={bumpVersion}
        />
      )}
      {!quiz && <SkeletonCard />}
    </>
  )
}

type QuizTabsProps = {
  quiz: DailyQuiz
  state: AppState
  dispatch: React.Dispatch<Action>
  bumpVersion: VoidFunction
}

const QuizTabs: React.FC<QuizTabsProps> = ({
  quiz,
  state,
  dispatch,
  bumpVersion,
}) => {
  return (
    <Stack sx={{ p: 0, justifyContent: "space-between" }}>
      <QuizCardHeader />
      <TabContext value={state.quizzingOnLemmas ?? true ? "lemma" : "gloss"}>
        <Box>
          <TabList
            onChange={(_e, tab) => {
              const quizzingOnLemmas = tab === "lemma"
              dispatch({ action: "saveQuizState", quizzingOnLemmas })
            }}
            centered
          >
            <Tab value={"lemma"} label="Lemma" />
            <Tab value={"gloss"} label="Gloss" />
          </TabList>
        </Box>
        <TabPanel value={"lemma"}>
          <QuizCard
            quiz={quiz}
            state={state}
            dispatch={dispatch}
            bumpVersion={bumpVersion}
            quizzingOnLemmas={true}
          />
        </TabPanel>
        <TabPanel value={"gloss"}>
          <QuizCard
            quiz={quiz}
            state={state}
            dispatch={dispatch}
            bumpVersion={bumpVersion}
            quizzingOnLemmas={false}
          />
        </TabPanel>
      </TabContext>
    </Stack>
  )
}

type QuizCardProps = {
  quiz: DailyQuiz
  quizzingOnLemmas: boolean
  state: AppState
  dispatch: React.Dispatch<Action>
  bumpVersion: VoidFunction
}

const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  quizzingOnLemmas,
  dispatch,
  bumpVersion,
}) => {
  const [flipped, setFlipped] = useState(false)
  const [changingCards, setChangingCards] = useState(false)
  const [flippedOnce, setFlippedOnce] = useState(flipped)
  const [card, setCard] = useState<PreparedTrial>()
  const [summary, setSummary] = useState<Summary>()
  const [intervals, setIntervals] = useState<IntervalsForOutcomes>()
  const nextCard = useCallback(() => {
    quiz
      .nextCard(quizzingOnLemmas)
      .then((c) => {
        setFlipped(false)
        setFlippedOnce(false)
        if (c) {
          setCard(c)
          setIntervals(quiz.intervalsForOutcomes(c.trial, quizzingOnLemmas))
        } else {
          setCard(undefined)
          setIntervals(undefined)
        }
      })
      .catch(errorHandler(dispatch))
  }, [quiz, quizzingOnLemmas])
  useEffect(() => {
    quiz
      .summary(quizzingOnLemmas)
      .then((s) => setSummary(s))
      .then(nextCard)
      .catch(errorHandler(dispatch))
  }, [quiz])
  const newQuiz = !(quiz.empty(quizzingOnLemmas) || card)
  return (
    <Stack
      sx={{
        w: "100%",
        justifyContent: "space-between",
      }}
    >
      <Box
        onClick={() => {
          if (card) {
            setFlipped(!flipped)
            setFlippedOnce(true)
          }
        }}
        sx={{
          // putting all the styling together to make it easier to follow the interactions
          p: 1,
          // make it clear you're supposed to click cards
          cursor: "pointer",
          // governs foreshortening on animated flip
          perspective: "1000px",
          // .inner contains the card faces
          ".inner": {
            p: 1,
            height: "250px",
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            transition: "transform 0.8s",
            transformStyle: "preserve-3d",
          },
          // a mechanism to hide the card's content during transition
          ".inner.hide .face *": {
            display: "none",
          },
          // flip the inner stack, rotating it about the y axis, when the flip class is added
          ".inner.flip": {
            transform: "rotateY(180deg)",
          },
          // the back face is pre-rotated, so flipping it brings it back to the normal left-to-right orientation
          ".inner .face.back": {
            transform: "rotateY(180deg)",
            borderColor: "secondary.main",
          },
          ".inner .face": {
            position: "absolute",
            width: "250px",
            height: "250px",
            p: 1,
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid black",
            borderColor: "primary.main",
            // don't show the flipped side of the card, only the front
            backfaceVisibility: "hidden",
            backgroundColor: "background.paper",
            boxSizing: "border-box",
            borderRadius: 1,
          },
        }}
      >
        <Stack
          className={`inner ${flipped ? "flip" : ""} ${
            changingCards ? "hide" : ""
          }`}
        >
          <Stack className="face" spacing={2}>
            {/** nothing to quiz on */}
            {quiz.empty(quizzingOnLemmas) && (
              <Typography>there is nothing to quiz on at this time</Typography>
            )}
            {/** something to quiz on and quiz is not yet over */}
            {!quiz.empty(quizzingOnLemmas) && !!card && (
              <>
                <Typography>
                  {card.phrase[quizzingOnLemmas ? "lemma" : "note"]}
                </Typography>
                {!!card.language && (
                  <BigLanguageChip
                    language={card.language!}
                    dispatch={dispatch}
                  />
                )}
              </>
            )}
            {/** there was something to quiz on, but we've flipped the last card */}
            {newQuiz && (
              <Button
                variant="contained"
                color="secondary"
                onClick={async () => {
                  void (await quiz
                    .newQuiz(quizzingOnLemmas)
                    .then(bumpVersion)
                    .catch(errorHandler(dispatch)))
                }}
              >
                new quiz
              </Button>
            )}
          </Stack>
          <Stack className="face back" spacing={2}>
            {!!card?.phrase && (
              <>
                <Link
                  onClick={() =>
                    dispatch({
                      action: "goto",
                      phrase: card.phrase,
                      citationIndex: selectCitation(card.phrase.citations),
                    })
                  }
                >
                  {card.phrase[quizzingOnLemmas ? "note" : "lemma"] ??
                    "empty stack"}
                </Link>
                {!!card.tags.length && (
                  <Stack direction="row" spacing={1}>
                    {card.tags.map((t) => (
                      <TagChip
                        key={t.id}
                        tag={t}
                        onClick={tagSearch(t, dispatch)}
                      />
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </Stack>
      </Box>
      {flippedOnce && !!intervals && (
        <Stack
          direction="row"
          spacing={2}
          sx={{ width: "100%", justifyContent: "space-between" }}
        >
          {intervals.map(([outcome, interval]) => (
            <IntervalButton
              outcome={outcome}
              interval={interval}
              quizzingOnLemmas={quizzingOnLemmas}
              quiz={quiz}
              card={card!}
              setCard={setCard}
              setSummary={setSummary}
              clearFlipped={() => {
                setFlipped(false)
                setFlippedOnce(false)
                setChangingCards(true)
                setTimeout(() => setChangingCards(false), 400) // make cards visible again after transition
              }}
              dispatch={dispatch}
            />
          ))}
        </Stack>
      )}
      {!flippedOnce && !!summary && <SummarizeQuiz summary={summary} />}
    </Stack>
  )
}

type IntervalButtonProps = {
  outcome: NonInitialOutcome
  interval: number
  quizzingOnLemmas: boolean
  quiz: DailyQuiz
  card: PreparedTrial
  setCard: (pt: PreparedTrial | undefined) => void
  setSummary: (s: Summary | undefined) => void
  clearFlipped: () => void
  dispatch: React.Dispatch<Action>
}

const IntervalButton: React.FC<IntervalButtonProps> = ({
  outcome,
  interval,
  quizzingOnLemmas,
  quiz,
  card,
  setCard,
  setSummary,
  clearFlipped,
  dispatch,
}) => {
  const handler = () => {
    quiz
      .recordTrial(card.trial, interval, outcome, quizzingOnLemmas)
      .then((newCard) => {
        clearFlipped()
        setCard(newCard ?? undefined)
      })
      .then(() => {
        quiz
          .summary(quizzingOnLemmas)
          .then((summary) => setSummary(summary))
          .catch(errorHandler(dispatch))
      })
      .catch(errorHandler(dispatch))
  }
  const special =
    outcome === "again" || outcome === "tomorrow" || outcome === "done"
  let description = special ? <>&nbsp;</> : describeTimeInterval(interval, true)
  let tt
  if (special) {
    switch (outcome) {
      case "again":
        tt = "show again in this quiz"
        break
      case "tomorrow":
        tt = "show again tomorrow"
        break
      case "done":
        tt = "remove from this and future quizzes"
    }
  }
  return (
    <Tooltip title={tt} arrow placement="top">
      <Stack sx={{ alignItems: "center", justifyContent: "center" }}>
        <IconButton onClick={handler}>
          <IconForOutcome outcome={outcome} />
        </IconButton>
        <Typography>{description}</Typography>
      </Stack>
    </Tooltip>
  )
}

const IconForOutcome: React.FC<{ outcome: NonInitialOutcome }> = ({
  outcome,
}) => {
  switch (outcome) {
    case "again":
      return <Replay color="error" />
    case "tomorrow":
      return <Redo />
    case "bad":
      return <SentimentVeryDissatisfied />
    case "ok":
      return <SentimentNeutral />
    case "good":
      return <SentimentVerySatisfied />
    case "done":
      return <Celebration color="success" />
  }
}

const SkeletonCard: React.FC = () => {
  return (
    <>
      <Skeleton />
      <Skeleton />
      <Skeleton />
    </>
  )
}

const SummarizeQuiz: React.FC<{ summary: Summary }> = ({ summary }) => {
  const counts = new Map<NonInitialOutcome, number>()
  for (const o of summary.outcomes) {
    counts[o] ??= 0
    counts[o]++
  }
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
      <Box sx={{ color: "primary.main" }}>{`new: ${summary.new}`}</Box>
      <Box sx={{ color: "secondary.main" }}>{`old: ${summary.old}`}</Box>
      <Box>{`left: ${summary.remaining}`}</Box>
      {!!summary.outcomes.length && (
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
      )}
      {OUTCOME_ORDER.map(
        (o) =>
          counts[o] && (
            <>
              <IconForOutcome outcome={o} />
              <Box>{counts[o]}</Box>
            </>
          )
      )}
    </Stack>
  )
}

// title and help for spaced repetition tab
const QuizCardHeader: React.FC = () => {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ justifyContent: "space-between", alignItems: "end" }}
    >
      <Typography variant="h5" component="h1">
        Quiz
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
              anchor: "quiz",
            })
          }
        }}
      >
        <Tooltip title="go to the Amanuensis documentation for the spaced repetition quiz">
          <HelpOutlineIcon />
        </Tooltip>
      </Link>
    </Stack>
  )
}
