import TabContext from "@mui/lab/TabContext"
import TabList from "@mui/lab/TabList"
import TabPanel from "@mui/lab/TabPanel"
import { Box, Button, Modal, Slider, Stack, Tab, Typography } from "@mui/material"
import React, { useEffect, useState } from "react"
import { DailyQuiz, Trial, TrialTimes } from "../util/spaced_repetition"
import { QuizTimeline } from "./QuizTimeline"
import { Action } from "../util/reducer"
import HelpLink from "./HelpLink"

export type QuizHistoryModalProps = {
  trial: Trial
  open: boolean
  setOpen: (open: boolean) => void
  initialTab?: "lemma" | "gloss"
  dailyQuiz: Pick<DailyQuiz, "inQuiz" | "addToQuiz" | "getConfig">
  dispatch?: React.Dispatch<Action>
}

const defaultPixelsPerDay = 10

const emptyTrialTimes: TrialTimes = {
  done: false,
  times: [],
  nextTime: new Date(),
}

export const QuizHistoryModal: React.FC<QuizHistoryModalProps> = ({
  trial,
  open,
  setOpen,
  initialTab = "lemma",
  dailyQuiz,
  dispatch,
}) => {
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)
  const [tab, setTab] = useState<string>(initialTab)
  const [lemmaPixelsPerDay, setLemmPixelsPerDay] = useState(defaultPixelsPerDay)
  const [glossPixelsPerDay, setGlossPixelsPerDay] = useState(defaultPixelsPerDay)

  if (prevInitialTab !== initialTab) {
    setPrevInitialTab(initialTab)
    setTab(initialTab)
  }

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
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5" component="h2">
            Quiz History
          </Typography>
          <HelpLink anchor="history" title="quiz history" />
        </Stack>
        <TabContext value={tab}>
          <Box>
            <TabList centered onChange={(_e, val) => setTab(val)}>
              <Tab value={"lemma"} label="Lemma" />
              <Tab value={"gloss"} label="Gloss" />
            </TabList>
          </Box>
          <TabPanel value={"lemma"}>
            <AdjustableQuizHistory
              trial={trial}
              quizzingOnLemmas={true}
              pixelsPerDay={lemmaPixelsPerDay}
              setPixelsPerDay={setLemmPixelsPerDay}
              dailyQuiz={dailyQuiz}
              dispatch={dispatch}
            />
          </TabPanel>
          <TabPanel value={"gloss"}>
            <AdjustableQuizHistory
              trial={trial}
              quizzingOnLemmas={false}
              pixelsPerDay={glossPixelsPerDay}
              setPixelsPerDay={setGlossPixelsPerDay}
              dailyQuiz={dailyQuiz}
              dispatch={dispatch}
            />
          </TabPanel>
        </TabContext>
      </Box>
    </Modal>
  )
}

type AdjustableQuizHistoryProps = {
  trial: Trial
  quizzingOnLemmas: boolean
  pixelsPerDay: number
  setPixelsPerDay: (pixelsPerDay: number) => void
  dailyQuiz: Pick<DailyQuiz, "inQuiz" | "addToQuiz" | "getConfig">
  dispatch?: React.Dispatch<Action>
}

const AdjustableQuizHistory: React.FC<AdjustableQuizHistoryProps> = ({
  trial,
  quizzingOnLemmas,
  pixelsPerDay,
  setPixelsPerDay,
  dailyQuiz,
  dispatch,
}) => {
  const times = quizzingOnLemmas ? trial.phraseTrials : trial.glossTrials
  const [inQuiz, setInQuiz] = useState(false)

  useEffect(() => {
    let active = true
    dailyQuiz.inQuiz(trial.phraseId, quizzingOnLemmas).then((res) => {
      if (active) setInQuiz(res)
    })
    return () => {
      active = false
    }
  }, [trial.phraseId, dailyQuiz, quizzingOnLemmas])

  const handleAdd = async () => {
    await dailyQuiz.addToQuiz(trial.phraseId, quizzingOnLemmas)
    setInQuiz(true)
    dispatch?.({ action: "config", config: dailyQuiz.getConfig() })
  }

  if (times)
    return (
      <>
        <QuizTimeline
          trialTimes={times ?? emptyTrialTimes}
          dotRadius={5}
          height={30}
          pixelsPerDay={pixelsPerDay}
        />
        <Slider
          size="small"
          value={pixelsPerDay}
          onChange={(_e, value) => setPixelsPerDay(value as number)}
          min={1}
          max={40}
          step={1}
        />
      </>
    )
  if (inQuiz)
    return (
      <Box>
        This has been added to today's quiz but you have not yet encountered it.
      </Box>
    )
  return (
    <Stack
      direction="row"
      sx={{ width: "100%", justifyContent: "center", alignItems: "center" }}
    >
      <Button color="primary" variant="contained" onClick={handleAdd}>
        Add to today's quiz
      </Button>
    </Stack>
  )
}
