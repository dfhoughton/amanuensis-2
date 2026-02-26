import React, { useCallback, useEffect, useMemo, useState } from "react"
import { AppState, exhaustiveGuard } from "../types/common"
import { Action, errorHandler, selectCitation } from "../util/reducer"
import HelpOutlineIcon from "@mui/icons-material/HelpOutline"
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  LinearProgress,
  Link,
  Modal,
  Stack,
  Tab,
  Tooltip,
  Typography,
} from "@mui/material"
import {
  DailyQuiz,
  DEFAULT_AUTO_GRADUATE_COUNT,
  describeTimeInterval,
  IntervalsForOutcomes,
  NonInitialOutcome,
  OUTCOME_ORDER,
  PreparedTrial,
  Summary,
} from "../util/spaced_repetition"
import TabContext from "@mui/lab/TabContext"
import TabList from "@mui/lab/TabList"
import TabPanel from "@mui/lab/TabPanel"
import { TagChip } from "./TagChip"
import { tagSearch } from "./Tags"
import { BigLanguageChip } from "./LanguageChip"
import {
  Replay,
  SentimentNeutral,
  SentimentVeryDissatisfied,
  SentimentVerySatisfied,
} from "@mui/icons-material"
import Redo from "@mui/icons-material/Redo"
import School from "@mui/icons-material/School"
import { newPhraseCount } from "../util/database"

type QuizProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

export const SpacedRepetitionQuiz: React.FC<QuizProps> = ({
  state,
  dispatch,
}) => {
  // set up initial quiz state
  const quiz = useMemo(() => new DailyQuiz(state.config!), [state.config])
  return (
    <QuizTabs
      quiz={quiz}
      state={state}
      dispatch={dispatch}
    />
  )
}

type QuizTabsProps = {
  quiz: DailyQuiz
  state: AppState
  dispatch: React.Dispatch<Action>
}

const QuizTabs: React.FC<QuizTabsProps> = ({
  quiz,
  state,
  dispatch,
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
            quizzingOnLemmas={true}
          />
        </TabPanel>
        <TabPanel value={"gloss"}>
          <QuizCard
            quiz={quiz}
            state={state}
            dispatch={dispatch}
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
}

const QuizCard: React.FC<QuizCardProps> = ({
  quiz,
  quizzingOnLemmas,
  state,
  dispatch,
}) => {
  const [flipped, setFlipped] = useState(false)
  const [changingCards, setChangingCards] = useState(false)
  const [flippedOnce, setFlippedOnce] = useState(flipped)
  const [card, setCard] = useState<PreparedTrial>()
  const [summary, setSummary] = useState<Summary>()
  const [intervals, setIntervals] = useState<IntervalsForOutcomes>()
  const [newCount, setNewCount] = useState(0)
  // what to do when we move on from a card
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
      .then(() => {
        quiz.summary(quizzingOnLemmas).then((s) => setSummary(s))
      })
      .catch(errorHandler(dispatch, "errored either getting next card or summary"))
  }, [quiz, quizzingOnLemmas, dispatch])
  // reveal the first card on mount
  useEffect(() => {
    nextCard()
  }, [quiz, nextCard])
  useEffect(() => {
    if (!(quiz.empty(quizzingOnLemmas) || card)) {
      newPhraseCount(quizzingOnLemmas)
        .then((n) => setNewCount(n))
        .catch(errorHandler(dispatch, "setting new phrase count failed"))
    }
  }, [quiz, quizzingOnLemmas, card, dispatch])
  const topic = card?.phrase[quizzingOnLemmas ? "lemma" : "note"]
  const newCard = !!card && quiz.newCard(card, quizzingOnLemmas)
  const newQuiz = !(quiz.empty(quizzingOnLemmas) || card)
  const autoGraduateCount =
    state.config?.autoGraduateCount ?? DEFAULT_AUTO_GRADUATE_COUNT
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
            py: 1,
            px: 2, // push things in from the side so the green dot isn't right by the edge of the card
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
          ".inner .content": {
            overflow: "hidden",
          }
        }}
      >
        <Stack
          className={`inner ${flipped ? "flip" : ""} ${changingCards ? "hide" : ""
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
                {!newCard && <Typography className="content">{topic}</Typography>}
                {newCard && (
                  <Badge variant="dot" color="success">
                    <Typography className="content">{topic}</Typography>
                  </Badge>
                )}
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
                variant="text"
                color="secondary"
                onClick={async () => {
                  void (await quiz
                    .newQuiz(quizzingOnLemmas)
                    .then(nextCard)
                    .catch(errorHandler(dispatch, "errored either getting a new quiz or setting its first card")))
                }}
              >
                <Badge badgeContent={newCount} color="success">
                  new quiz
                </Badge>
              </Button>
            )}
          </Stack>
          <Stack className="face back" spacing={2}>
            {!!card?.phrase && (
              <>
                <Link
                  className="content"
                  onClick={() =>
                    dispatch({
                      action: "goto",
                      phrase: card.phrase,
                      citationIndex: selectCitation(card.phrase.citations),
                    })
                  }
                  sx={{ textDecoration: "none" }}
                >
                  {card.phrase[quizzingOnLemmas ? "note" : "lemma"]}
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
              key={outcome}
              outcome={outcome}
              interval={interval}
              quizzingOnLemmas={quizzingOnLemmas}
              quiz={quiz}
              card={card!}
              setCard={setCard}
              setSummary={setSummary}
              setIntervals={setIntervals}
              autoGraduateCount={autoGraduateCount}
              success={
                // if we're one away from the autograduate count, we're on the verge of autograduating
                !!summary?.outcomes &&
                quiz.goodCount(card!, quizzingOnLemmas) >= autoGraduateCount - 1
              }
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
  setIntervals: React.Dispatch<
    React.SetStateAction<IntervalsForOutcomes | undefined>
  >
  clearFlipped: () => void
  autoGraduateCount: number
  success: boolean // really where we're on the verge of auto-graduating -- one more "good" and we're done
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
  setIntervals,
  clearFlipped,
  autoGraduateCount,
  success,
  dispatch,
}) => {
  const [showModal, setShowModal] = useState(false)
  const handleSave = (noAutograduate: boolean, afterSave?: VoidFunction) => {
    quiz
      .recordTrial(
        card.trial,
        interval,
        outcome,
        noAutograduate ? 0 : autoGraduateCount,
        quizzingOnLemmas
      )
      .then((rv) => {
        clearFlipped()
        if (rv) {
          const { card: newCard, intervals, graduated } = rv
          if (graduated)
            dispatch({
              action: "message",
              message: `The ${quizzingOnLemmas ? "lemma" : "gloss"} of the “${card.phrase.lemma
                }” will not appear in future quizzes.`,
              messageLevel: "success",
            })
          setCard(newCard)
          setIntervals(intervals)
          if (afterSave) afterSave()
        } else {
          setCard(undefined)
        }
      })
      .then(() => {
        quiz
          .summary(quizzingOnLemmas)
          .then((summary) => setSummary(summary))
          .catch(errorHandler(dispatch, "errored getting new summary for display"))
      })
      .catch(errorHandler(dispatch, "errored recording trial"))
  }
  const maybeAutoGraduate = success && outcome === "good"
  const handler = maybeAutoGraduate
    ? () => setShowModal(true)
    : () => handleSave(false)
  const special =
    outcome === "again" || outcome === "tomorrow" || outcome === "done"
  const description = special ? <>&nbsp;</> : describeTimeInterval(interval, true)
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
        break
      default:
        exhaustiveGuard(outcome)
    }
  }
  return (
    <>
      <Tooltip enterDelay={200} title={tt} arrow placement="top">
        <Stack sx={{ alignItems: "center", justifyContent: "center" }}>
          <IconButton onClick={handler}>
            <IconForOutcome outcome={outcome} success={success} />
          </IconButton>
          <Typography>{description}</Typography>
        </Stack>
      </Tooltip>
      {maybeAutoGraduate && (
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Stack direction="column" spacing={2}>
            <Typography
              variant="h4"
              component="h2"
              sx={{ textAlign: "center", color: "primary.main" }}
            >
              Congratulations!
            </Typography>
            <Typography>
              You have marked your recall of the{" "}
              {quizzingOnLemmas ? "gloss" : "lemma"} of “
              {quizzingOnLemmas ? card.phrase.lemma : card.phrase.note}” as good{" "}
              {autoGraduateCount} times in a row. Shall we mark it as learned,
              removing it from future quizzes, or simply mark it as good one
              more time?
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <Button variant="outlined" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setShowModal(false)
                  handleSave(true, () =>
                    dispatch({
                      action: "message",
                      messageLevel: "info",
                      message: `Your recall of the ${quizzingOnLemmas ? "gloss" : "lemma"
                        } of “${quizzingOnLemmas ? card.phrase.lemma : card.phrase.note
                        }” has been marked as good.`,
                    })
                  )
                }}
                endIcon={<SentimentVerySatisfied />}
              >
                Good
              </Button>
              <Button
                variant="contained"
                color="success"
                autoFocus
                onClick={() => {
                  setShowModal(false)
                  handleSave(false)
                }}
                endIcon={<School />}
              >
                Learned
              </Button>
            </Stack>
          </Stack>
        </Modal>
      )}
    </>
  )
}

const IconForOutcome: React.FC<{
  outcome: NonInitialOutcome
  success?: boolean
}> = ({ outcome, success }) => {
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
      return <SentimentVerySatisfied color={success ? "success" : undefined} />
    case "done":
      return <School color="success" />
    default:
      exhaustiveGuard(outcome)
  }
}

const SummarizeQuiz: React.FC<{ summary: Summary }> = ({ summary }) => {
  const counts = new Map<NonInitialOutcome, number>()
  for (const o of summary.outcomes) {
    counts.set(o, (counts.get(o) ?? 0) + 1)
  }
  const { new: n, old: o, remaining: l } = summary
  const denominator = n + o
  const progress = (1 - l / denominator) * 100
  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 1, justifyContent: "center" }}
      >
        <Box sx={{ color: "primary.main" }}>{`new: ${n}`}</Box>
        <Box sx={{ color: "secondary.main" }}>{`old: ${o}`}</Box>
        {!!summary.outcomes.length && (
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        )}
        {OUTCOME_ORDER.map(
          (o) =>
            counts.get(o) && (
              <Stack
                key={o}
                direction="row"
                spacing={0.5}
                sx={{ mt: 1, justifyContent: "center" }}
              >
                <IconForOutcome outcome={o} key={o} />
                <Box key={`${o}_count`}>{counts.get(o)}</Box>
              </Stack>
            )
        )}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ my: 1, alignItems: "center" }}>
        <LinearProgress
          variant="determinate"
          color="success"
          value={progress}
          sx={{ width: "100%" }}
        />
        <Stack direction="row" spacing={0.5} sx={{ color: "text.secondary" }}>
          <Box>{denominator - l}</Box> <Box>/</Box> <Box>{denominator}</Box>
        </Stack>
      </Stack>
    </>
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
        <Tooltip enterDelay={200} arrow title="go to the Amanuensis documentation for the spaced repetition quiz">
          <HelpOutlineIcon />
        </Tooltip>
      </Link>
    </Stack>
  )
}
