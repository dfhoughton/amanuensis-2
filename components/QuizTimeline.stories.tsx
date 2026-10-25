import type { Meta, StoryObj } from '@storybook/react-vite'
import { QuizTimeline } from './QuizTimeline'
import { TrialTimes, Outcome } from '../util/spaced_repetition'

const meta: Meta<typeof QuizTimeline> = {
  title: 'Components/QuizTimeline',
  component: QuizTimeline,
  argTypes: {
    trialTimes: {
      description: 'TrialTimes object containing times and outcomes',
      control: { type: 'object' },
    },
    pixelsPerDay: {
      description: 'Minimum width for each day in pixels',
      control: { type: 'number' },
    },
    height: {
      description: 'Height of the timeline in pixels',
      control: { type: 'number' },
    },
    dotRadius: {
      description: 'Radius of the timeline dots in pixels',
      control: { type: 'number' },
    },
  },
}

export default meta

type Story = StoryObj<typeof QuizTimeline>

const makeHours = (count: number) => count * 60 * 60 * 1000
const makeDays = (count: number) => count * makeHours(24)

// Helper to create a Date object from a string or offset
function makeDate(offsetDays: number = 0, offsetHours: number = 0): Date {
  const now = new Date()
  // Set to start of day for consistency
  now.setHours(0, 0, 0, 0)
  return new Date(now.getTime() + makeDays(offsetDays) + makeHours(offsetHours))
}

// Sample trial times for stories
const createTrialTimes = (
  timesWithOutcomes: Array<[number, number, Outcome]>, // [offsetDays, offsetHours, outcome]
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

// Story 1: Empty timeline
const emptyTrialTimes: TrialTimes = {
  done: false,
  times: [],
  nextTime: makeDate(1),
}

export const Empty: Story = {
  args: {
    trialTimes: emptyTrialTimes,
  },
}

// Story 2: Single point
const singlePointTrialTimes: TrialTimes = createTrialTimes([
  [0, 0, "first"],
])

export const SinglePoint: Story = {
  args: {
    trialTimes: singlePointTrialTimes,
    pixelsPerDay: 40,
    height: 60,
    dotRadius: 8,
  },
}

// Story 3: Multiple points with different outcomes
const multiplePointsTrialTimes: TrialTimes = createTrialTimes([
  [0, 0, "first"],
  [1, 0, "bad"],
  [3, 0, "ok"],
  [7, 0, "good"],
  [14, 0, "good"],
  [30, 0, "done"],
])

export const MultipleOutcomes: Story = {
  args: {
    trialTimes: multiplePointsTrialTimes,
    pixelsPerDay: 40,
    height: 60,
    dotRadius: 8,
  },
}

// Story 4: Points close together (hours apart)
const closePointsTrialTimes: TrialTimes = createTrialTimes([
  [0, 0, "first"],
  [0, 1, "again"],
  [0, 4, "bad"],
  [0, 8, "ok"],
  [0, 12, "good"],
])

export const CloseTogether: Story = {
  args: {
    trialTimes: closePointsTrialTimes,
    pixelsPerDay: 40,
    height: 60,
    dotRadius: 6,
  },
}

// Story 5: Long timeline (months)
const longTimelineTrialTimes: TrialTimes = createTrialTimes([
  [0, 0, "first"],
  [1, 0, "bad"],
  [3, 0, "ok"],
  [7, 0, "good"],
  [14, 0, "good"],
  [30, 0, "good"],
  [60, 0, "good"],
  [90, 0, "done"],
])

export const LongTimeline: Story = {
  args: {
    trialTimes: longTimelineTrialTimes,
    pixelsPerDay: 10,
    height: 60,
    dotRadius: 8,
  },
}

// Story 6: All outcome types
const allOutcomesTrialTimes: TrialTimes = createTrialTimes([
  [0, 0, "first"],
  [1, 0, "again"],
  [2, 0, "tomorrow"],
  [3, 0, "bad"],
  [4, 0, "ok"],
  [5, 0, "good"],
  [6, 0, "done"],
])

export const AllOutcomeTypes: Story = {
  args: {
    trialTimes: allOutcomesTrialTimes,
    pixelsPerDay: 50,
    height: 80,
    dotRadius: 10,
  },
}

// Story 7: Custom styling
const customStylingTrialTimes: TrialTimes = createTrialTimes([
  [0, 0, "first"],
  [5, 0, "good"],
  [10, 0, "done"],
])

export const CustomStyling: Story = {
  args: {
    trialTimes: customStylingTrialTimes,
    pixelsPerDay: 60,
    height: 100,
    dotRadius: 12,
  },
}

// Story 8: Done/finished timeline
const doneTrialTimes: TrialTimes = {
  done: true,
  times: [
    [makeDate(-30), "first"],
    [makeDate(-20), "good"],
    [makeDate(-10), "good"],
    [makeDate(-5), "done"],
  ],
  nextTime: makeDate(100),
}

export const DoneTimeline: Story = {
  args: {
    trialTimes: doneTrialTimes,
    pixelsPerDay: 30,
    height: 60,
    dotRadius: 8,
  },
}

// Story 9: Done/finished timeline
const graduatedTrialTimes: TrialTimes = {
  done: true,
  times: [
    [makeDate(-30), "first"],
    [makeDate(-20), "good"],
    [makeDate(-10), "good"],
    [makeDate(-5), "good"],
  ],
  nextTime: makeDate(100),
}

export const GraduatedTimeline: Story = {
  args: {
    trialTimes: graduatedTrialTimes,
    pixelsPerDay: 30,
    height: 60,
    dotRadius: 8,
  },
}
