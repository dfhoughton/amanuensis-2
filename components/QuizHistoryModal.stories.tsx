import type { Meta, StoryObj } from '@storybook/react-vite'
import React, { useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { QuizHistoryModal, QuizHistoryModalProps } from './QuizHistoryModal'
import { Outcome, TrialTimes } from '../util/spaced_repetition'

const makeHours = (count: number) => count * 60 * 60 * 1000
const makeDays = (count: number) => count * makeHours(24)

const createTrialTimes = (
  timesWithOutcomes: Array<[number, number, Outcome]>,
  done: boolean = false,
  nextTimeOffset: number = 7,
): TrialTimes => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const times: Array<[Date, Outcome]> = timesWithOutcomes.map(([days, hours, outcome]) => {
    const date = new Date(now.getTime() + makeDays(days) + makeHours(hours))
    return [date, outcome]
  })

  const nextTime = new Date(now.getTime() + makeDays(nextTimeOffset))

  return {
    done,
    times,
    nextTime,
  }
}

const createMockDailyQuiz = (options?: {
  inQuiz?: boolean | ((quizzingOnLemmas: boolean) => boolean)
  onAdd?: (phraseId: number, quizzingOnLemmas: boolean) => void
}) => {
  let enqueued = options?.inQuiz ?? false

  return {
    inQuiz: async (_phraseId: number, quizzingOnLemmas: boolean) => {
      return typeof enqueued === "function" ? enqueued(quizzingOnLemmas) : enqueued
    },
    addToQuiz: async (phraseId: number, quizzingOnLemmas: boolean) => {
      enqueued = true // flips state so UI updates interactively in Storybook!
      options?.onAdd?.(phraseId, quizzingOnLemmas)
    },
    getConfig: () => ({})
  }
}

// Interactive wrapper so modal can be closed and reopened in Storybook
const ModalWrapper: React.FC<QuizHistoryModalProps> = (props) => {
  const [prevOpen, setPrevOpen] = useState(props.open)
  const [open, setOpen] = useState(props.open)

  if (prevOpen !== props.open) {
    setPrevOpen(props.open)
    setOpen(props.open)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 240,
        gap: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Status: {open ? 'Modal is Open' : 'Modal is Closed'}
      </Typography>
      <Button
        variant="contained"
        onClick={() => {
          setOpen(true)
          props.setOpen?.(true)
        }}
      >
        Open Quiz History Modal
      </Button>
      <QuizHistoryModal
        {...props}
        open={open}
        setOpen={(nextOpen) => {
          setOpen(nextOpen)
          props.setOpen?.(nextOpen)
        }}
      />
    </Box>
  )
}

const meta: Meta<typeof QuizHistoryModal> = {
  title: 'Components/QuizHistoryModal',
  component: QuizHistoryModal,
  argTypes: {
    trial: {
      description: 'Trial record containing phraseTrials and glossTrials',
      control: { type: 'object' },
    },
    open: {
      description: 'Controls whether the modal is visible',
      control: { type: 'boolean' },
    },
    setOpen: {
      description: 'Callback when modal requests to open or close',
      action: 'setOpen',
    },
    initialTab: {
      description: 'Initial active tab ("lemma" or "gloss")',
      control: { type: 'radio' },
      options: ['lemma', 'gloss'],
    },
  },
  args: {
    open: true,
  },
  render: (args) => <ModalWrapper {...args} />,
}

export default meta

type Story = StoryObj<typeof QuizHistoryModal>

// Sample trials
const lemmaTimesActive = createTrialTimes([
  [-30, 0, 'first'],
  [-28, 0, 'bad'],
  [-25, 0, 'ok'],
  [-18, 0, 'good'],
  [-7, 0, 'good'],
], false, 14)

const glossTimesActive = createTrialTimes([
  [-20, 0, 'first'],
  [-18, 0, 'good'],
  [-10, 0, 'good'],
  [-2, 0, 'good'],
], false, 21)

const lemmaTimesDone = createTrialTimes([
  [-60, 0, 'first'],
  [-45, 0, 'ok'],
  [-30, 0, 'good'],
  [-15, 0, 'good'],
  [-1, 0, 'done'],
], true, 90)

const glossTimesDone = createTrialTimes([
  [-50, 0, 'first'],
  [-35, 0, 'good'],
  [-20, 0, 'good'],
  [-5, 0, 'done'],
], true, 90)

const longTimelineTimes = createTrialTimes([
  [-90, 0, 'first'],
  [-80, 0, 'bad'],
  [-72, 0, 'again'],
  [-60, 0, 'ok'],
  [-45, 0, 'good'],
  [-30, 0, 'good'],
  [-14, 0, 'good'],
  [-3, 0, 'good'],
], false, 30)

const sameDayTimes = createTrialTimes([
  [0, 0, 'first'],
  [0, 1, 'again'],
  [0, 3, 'bad'],
  [0, 6, 'ok'],
  [0, 10, 'good'],
], false, 1)

const allOutcomesTimes = createTrialTimes([
  [-14, 0, 'first'],
  [-12, 0, 'again'],
  [-10, 0, 'tomorrow'],
  [-8, 0, 'bad'],
  [-6, 0, 'ok'],
  [-3, 0, 'good'],
  [-1, 0, 'done'],
], true, 30)

// Story 1: Default / Both Lemma and Gloss with active learning histories
export const Default: Story = {
  args: {
    trial: {
      phraseId: 1,
      phraseTrials: lemmaTimesActive,
      glossTrials: glossTimesActive,
    },
    dailyQuiz: createMockDailyQuiz({ inQuiz: true }),
    open: true,
    initialTab: 'lemma',
  },
}

// Story 2: Only Lemma trials available (glossTrials is undefined)
export const OnlyLemmaTrials: Story = {
  args: {
    trial: {
      phraseId: 2,
      phraseTrials: lemmaTimesActive,
      glossTrials: undefined,
    },
    dailyQuiz: createMockDailyQuiz({ inQuiz: true }),
    open: true,
    initialTab: 'lemma',
  },
}

// Story 3: Only Gloss trials available (phraseTrials is undefined)
export const OnlyGlossTrials: Story = {
  args: {
    trial: {
      phraseId: 3,
      phraseTrials: undefined,
      glossTrials: glossTimesActive,
    },
    dailyQuiz: createMockDailyQuiz({ inQuiz: false }),
    open: true,
    initialTab: 'gloss',
  },
}

// Story 4: Empty history (brand new phrase with no trials on either tab)
export const EmptyHistory: Story = {
  args: {
    trial: {
      phraseId: 4,
      phraseTrials: undefined,
      glossTrials: undefined,
    },
    dailyQuiz: createMockDailyQuiz({ inQuiz: true }),
    open: true,
    initialTab: 'lemma',
  },
}

// Story 5: Completed trials on both tabs (done = true)
export const CompletedBoth: Story = {
  args: {
    trial: {
      phraseId: 5,
      phraseTrials: lemmaTimesDone,
      glossTrials: glossTimesDone,
    },
    dailyQuiz: createMockDailyQuiz({ inQuiz: true }),
    open: true,
    initialTab: 'lemma',
  },
}

// Story 6: Initially active on the Gloss tab
export const InitialTabGloss: Story = {
  args: {
    trial: {
      phraseId: 6,
      phraseTrials: lemmaTimesActive,
      glossTrials: glossTimesActive,
    },
    dailyQuiz: createMockDailyQuiz({ inQuiz: true }),
    open: true,
    initialTab: 'gloss',
  },
}

// Story 7: Long timeline with many trials spanning months (tests horizontal scroll)
export const LongHistory: Story = {
  args: {
    trial: {
      phraseId: 7,
      phraseTrials: longTimelineTimes,
      glossTrials: glossTimesActive,
    },
    dailyQuiz: createMockDailyQuiz({ inQuiz: true }),
    open: true,
    initialTab: 'lemma',
  },
}

// Story 8: Close together (multiple reviews on the same day)
export const SameDayReviews: Story = {
  args: {
    trial: {
      phraseId: 8,
      phraseTrials: sameDayTimes,
      glossTrials: glossTimesActive,
    },
    dailyQuiz: createMockDailyQuiz({ inQuiz: true }),
    open: true,
    initialTab: 'lemma',
  },
}

// Story 9: All outcome types present
export const AllOutcomes: Story = {
  args: {
    trial: {
      phraseId: 9,
      phraseTrials: allOutcomesTimes,
      glossTrials: glossTimesActive,
    },
    dailyQuiz: createMockDailyQuiz({ inQuiz: true }),
    open: true,
    initialTab: 'lemma',
  },
}

// Story 10: Modal is closed initially, can be opened via the button
export const ClosedInitially: Story = {
  args: {
    trial: {
      phraseId: 10,
      phraseTrials: lemmaTimesActive,
      glossTrials: glossTimesActive,
    },
    dailyQuiz: createMockDailyQuiz({ inQuiz: true }),
    open: false,
    initialTab: 'lemma',
  },
}

