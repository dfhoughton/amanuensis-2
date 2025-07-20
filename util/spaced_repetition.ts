import { Configuration, Language, Phrase, Tag } from "../types/common"
import {
  howTheQuizIsGoingSoFar,
  makeQuiz,
  prepareTrial,
  saveTrial,
  setConfiguration,
} from "./database"
import { lastN, sameDate } from "./general"

export type TimeAndOutcome = [Date, Outcome]

export type TrialTimes = {
  // whether this question-answer pair is marked as complete -- no longer something one might be quizzed on
  done: boolean
  // times for next trials; the gaps between these are used to suggest the next gap
  times: TimeAndOutcome[]
  // the next time this pair will be eligible material for a quiz
  nextTime: Date
}

// the record of success for one phrase
export type Trial = {
  phraseId: number
  phraseTrials?: TrialTimes
  glossTrials?: TrialTimes
}

// information required to set up a flashcard
export type PreparedTrial = {
  trial: Trial
  phrase: Phrase
  language: Language
  tags: Tag[]
}

export type QuizSignature = {
  // time the quiz began; used to determine whether we need to start a new quiz and,
  // upon restarting the quiz, which phrases have already been seen
  startTime: Date
  // phrase ids and their trial order
  phrases: number[]
  // what is the thing being tested?
  phrasesAreQuestionsAndGlossesAreAnswers: boolean
  // which flashcard to show next
  index: number
}

export type Outcome =
  | "first" // for recording the time of the first exposure
  | "again"
  | "tomorrow"
  | "bad"
  | "ok"
  | "good"
  | "done"

export type NonInitialOutcome = Exclude<Outcome, "first">

// useful for layout in various places
export const OUTCOME_ORDER: NonInitialOutcome[] = [
  "again",
  "tomorrow",
  "bad",
  "ok",
  "good",
  "done",
]

export type IntervalsForOutcomes = Array<[NonInitialOutcome, number]>

// a summary of how the quiz is going
export type Summary = {
  new: number
  old: number
  remaining: number
  outcomes: NonInitialOutcome[]
}

const oneSecond = 1000
const oneMinute = oneSecond * 60
const oneHour = oneMinute * 60
const oneDay = oneHour * 24 // the milliseconds in one day
const oneWeek = oneDay * 7
const oneMonth = oneDay * 31
const maximumBadInterval = oneMonth * 1.5

export function describeTimeInterval(
  interval: number,
  abbreviate: boolean = false
): string {
  let unit,
    amount,
    decimals = false
  if (interval >= oneMonth) {
    unit = abbreviate ? "mo" : "month"
    amount = interval / oneMonth
    decimals = true
  } else if (interval >= oneWeek) {
    unit = abbreviate ? "wk" : "week"
    amount = interval / oneWeek
    decimals = true
  } else if (interval >= oneDay) {
    unit = abbreviate ? "d" : "day"
    amount = interval / oneDay
  } else if (interval >= oneHour) {
    unit = abbreviate ? "h" : "hour"
    amount = interval / oneHour
  } else if (interval >= oneMinute) {
    unit = abbreviate ? "m" : "minute"
    amount = interval / oneMinute
  } else {
    unit = abbreviate ? "s" : "second"
    amount = interval / oneSecond
  }
  amount = decimals ? Math.round(amount * 10) / 10 : Math.round(amount)
  if (!(abbreviate || amount === 1.0)) unit += "s"
  return abbreviate ? `${amount}${unit}` : `${amount} ${unit}`
}

export const MAX_NEW_PHRASES_PER_QUIZ = 10

// a controller that manages the daily quizzes
// its methods are asynchronous because they always persist state to the database
export class DailyQuiz {
  private config: Configuration
  private now: Date
  constructor(config: Configuration) {
    this.now = new Date()
    this.config = config
  }
  // is there nothing to quiz on?
  empty(quizzingOnLemmas: boolean): boolean {
    const phrases = this.config[this.quizKey(quizzingOnLemmas)]?.phrases
    return phrases === undefined || phrases.length === 0
  }
  // obtains the currently live lemma quiz, constructing it as necessary
  async quiz(quizzingOnLemmas: boolean): Promise<QuizSignature> {
    const quizType = this.quizKey(quizzingOnLemmas)
    if (
      !(
        this.config[quizType] &&
        sameDate(this.now, this.config[quizType].startTime)
      )
    ) {
      const q = (this.config[quizType] = await makeQuiz(
        MAX_NEW_PHRASES_PER_QUIZ,
        quizzingOnLemmas
      ))
      void (await setConfiguration(this.config))
    }
    return this.config[quizType]
  }
  // replace the current quiz signature of quizzingOnLemmas type in the configuration
  async newQuiz(quizzingOnLemmas: boolean): Promise<void> {
    const q = (this.config[this.quizKey(quizzingOnLemmas)] = await makeQuiz(
      MAX_NEW_PHRASES_PER_QUIZ,
      quizzingOnLemmas
    ))
    void (await setConfiguration(this.config))
  }
  async nextCard(quizzingOnLemmas: boolean): Promise<PreparedTrial | null> {
    const quiz = await this.quiz(quizzingOnLemmas)
    if (quiz.index === quiz.phrases.length) return null
    const phraseId = quiz.phrases[quiz.index]
    return await prepareTrial(phraseId)
  }
  // get information about how the quiz is going so far
  async summary(quizzingOnLemmas: boolean): Promise<Summary> {
    const q = await this.quiz(quizzingOnLemmas)
    return await howTheQuizIsGoingSoFar(
      q.phrases,
      q.startTime,
      quizzingOnLemmas
    )
  }
  // calculate the time options for a card based on its past trials
  intervalsForOutcomes(
    trial: Trial,
    quizzingOnLemmas: boolean
  ): IntervalsForOutcomes {
    let tomorrow = new Date(this.now.getTime() + oneDay)
    tomorrow = new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
      1,
      0,
      0,
      0
    )
    const rv: IntervalsForOutcomes = [
      ["again", 5 * oneMinute],
      ["tomorrow", tomorrow.getTime() - this.now.getTime()],
    ]
    let previous = trial[quizzingOnLemmas ? "phraseTrials" : "glossTrials"]?.times.map(n => n[0])
    let interval: number
    if (previous?.length) {
      previous = lastN(previous, 4)
      let [[t0], ...rest] = previous.map((n, i) => [n, i] as [Date, number])
      if (rest.length) {
        let sum = 0, denominator = 0
        for (const [t, i] of rest) {
          sum += (t.getTime() - t0.getTime()) * i
          denominator += i
          t0 = t
        }
        interval = sum / denominator
        if (interval > maximumBadInterval) interval = maximumBadInterval
      }
    }
    interval ??= oneDay
    if (interval < oneDay) interval = oneDay
    // ratios borrowed by approximating what Anki seems to do
    rv.push(["bad", this.truncateToDay(interval)])
    rv.push(["ok", this.truncateToDay((interval *= 2.22))])
    rv.push(["good", this.truncateToDay((interval *= 1.3))])
    rv.push(["done", this.truncateToDay(interval * 1.1)])
    return rv
  }
  // returns an interval that, when added to this.now, puts you at the beginning of the appropriate day
  private truncateToDay(interval: number): number {
    const t2 = new Date(this.now.getTime() + interval)
    const t3 = new Date(t2.getFullYear(), t2.getMonth(), t2.getDate())
    return t3.getTime() - this.now.getTime()
  }
  // records the outcome of the most recent trial and returns the next card to display, if any
  async recordTrial(
    t: Trial,
    interval: number,
    outcome: Outcome,
    quizzingOnLemmas: boolean
  ): Promise<PreparedTrial | null> {
    const now = new Date()
    const time = new Date(now.getTime() + interval)
    const signature = this.config[this.quizKey(quizzingOnLemmas)]
    const tk = this.trialsKey(quizzingOnLemmas)
    const trialTimes: TrialTimes = t[tk] ?? {
      done: false,
      nextTime: time,
      times: [],
    }
    t[tk] = trialTimes
    if (trialTimes.times.length === 0) trialTimes.times.push([now, "first"]) // record a starting time from which to measure first interval
    trialTimes.times.push([time, outcome])
    trialTimes.nextTime = time
    if (outcome === "again") {
      // move phrase to end of queue
      signature?.phrases.splice(signature.index, 1)
      signature?.phrases.push(t.phraseId)
    } else {
      if (outcome === "done") trialTimes.done = true
      signature && signature.index++
    }
    void (await saveTrial(t))
    void (await setConfiguration(this.config))
    return await this.nextCard(quizzingOnLemmas)
  }
  private quizKey(
    quizzingOnLemmas: boolean
  ): "currentGlossQuiz" | "currentPhraseQuiz" {
    return quizzingOnLemmas ? "currentPhraseQuiz" : "currentGlossQuiz"
  }
  private trialsKey(quizzingOnLemmas: boolean): "phraseTrials" | "glossTrials" {
    return quizzingOnLemmas ? "phraseTrials" : "glossTrials"
  }
}
