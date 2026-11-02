import React, { useMemo, useState } from "react"
import {
  TrialTimes,
  describeTimeInterval,
  Outcome,
} from "../util/spaced_repetition"
import { Tooltip, Box, useTheme, styled } from "@mui/material"
import { IconForOutcome } from "./SpacedRepetitionQuiz"

// Format date for display
function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

type QuizTimelineProps = {
  trialTimes: TrialTimes
  /** Minimum width for each day in pixels. Default: 40 */
  pixelsPerDay?: number
  /** Height of the timeline in pixels. Default: 60 */
  height?: number
  /** Radius of the timeline dots in pixels. Default: 8 */
  dotRadius?: number
}

// Styled component for the bullseye effect
const TimelinePointGroup = styled("g")({
  circle: {
    transition: "opacity 0.2s ease-in-out",
  },
  "&:hover .bullseye-bg-outer, &:hover .bullseye-dot-ring, &:hover .bullseye-bg-inner":
  {
    opacity: 1,
  },
})

// Styled component for the timeline container
const TimelineContainer = styled(Box)({
  width: "100%",
  overflowX: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: "#888 #f1f1f1",
  "&::-webkit-scrollbar": {
    height: "8px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "#888",
    borderRadius: "4px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "#555",
  },
})

/** Displays trial outcomes on a horizontal timeline with SVG */
export const QuizTimeline: React.FC<QuizTimelineProps> = ({
  trialTimes,
  pixelsPerDay = 40,
  height = 60,
  dotRadius = 6,
}) => {
  const theme = useTheme()
  const { times } = trialTimes

  // Track which point is hovered for better UX
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Get colors for outcomes, using theme colors for bad and good
  const getOutcomeColor = (outcome: Outcome): { color: string } => {
    switch (outcome) {
      case "again":
      case "tomorrow":
      case "bad":
        return { color: theme.palette.error.main }
      case "good":
      case "done":
        return { color: theme.palette.success.main }
      case "first":
        return { color: theme.palette.info.main }
      default:
        return { color: theme.palette.info.main }
    }
  }

  // Calculate total width based on time span - must be called unconditionally
  const minTime = useMemo(
    () =>
      times && times.length > 0
        ? Math.min(...times.map(([date]) => date.getTime()))
        : 0,
    [times],
  )
  const maxTime = useMemo(
    () =>
      times && times.length > 0
        ? Math.max(...times.map(([date]) => date.getTime()))
        : 0,
    [times],
  )
  const timeSpanMs = maxTime - minTime
  const timeSpanDays = timeSpanMs / (1000 * 60 * 60 * 24)

  // Minimum width to ensure visibility
  const minWidth = 200
  const totalWidth = Math.max(minWidth, timeSpanDays * pixelsPerDay)

  // Position each point - must be called unconditionally
  const points = useMemo(() => {
    if (!times || times.length === 0) return []
    if (times.length === 1) {
      return [{ date: times[0][0], outcome: times[0][1], x: 0 }]
    }

    // times[0][0] is trial 1's date, whose outcome was times[1][1]
    // times[i - 1][0] is trial i's date, whose outcome was times[i][1]
    const historyPoints = times.slice(1).map(([_, outcome], idx) => {
      const trialDate = times[idx][0]
      return {
        date: trialDate,
        outcome,
        x: timeSpanMs > 0 ? ((trialDate.getTime() - minTime) / timeSpanMs) * totalWidth : 0,
      }
    })

    return historyPoints
  }, [times, minTime, timeSpanMs, totalWidth])

  // Bullseye hover effect: dot, bg ring, dot ring, bg ring
  const bullseyeRadius = dotRadius * 2
  const ringWidth = dotRadius / 3

  // vertical offset of line
  const topFraction = 3 / 4
  const outerRadius = bullseyeRadius + 10
  const outerDiameter = outerRadius * 2
  const y = height * topFraction + outerRadius

  // If no times, return empty
  if (!times || times.length === 0) {
    return (
      <TimelineContainer>
        <svg width="100%" height={height} />
      </TimelineContainer>
    )
  }

  return (
    <TimelineContainer
      sx={{
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: theme.palette.primary.main,
        },
      }}
    >
      <svg
        width={totalWidth + outerDiameter}
        height={height + outerDiameter}
        viewBox={`0 0 ${totalWidth + outerDiameter} ${height + outerDiameter}`}
        style={{ display: "block" }}
      >
        {/* Draw a subtle horizontal line as the timeline */}
        <line
          x1={outerRadius}
          y1={y}
          x2={totalWidth + outerRadius}
          y2={y}
          stroke={theme.palette.divider}
          strokeWidth={1}
        />

        {/* Draw segments between points */}
        {points.slice(0, -1).map((point, index) => {
          const nextPoint = points[index + 1]
          const segmentLengthMs =
            nextPoint.date.getTime() - point.date.getTime()
          const segmentLengthDays = segmentLengthMs / (1000 * 60 * 60 * 24)
          const segmentDescription = describeTimeInterval(segmentLengthMs)
          const x1 = point.x + outerRadius
          const x2 = nextPoint.x + outerRadius

          return (
            <Tooltip
              key={`segment-${index}`}
              title={segmentDescription}
              arrow
              followCursor
              placement="top"
              enterDelay={300}
            >
              <g>
                <line
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  strokeDasharray={segmentLengthDays > 7 ? "5,3" : undefined}
                  className="timeline-segment"
                />
                {/* fat line for tooltips */}
                <line
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke={"transparent"}
                  strokeWidth={8}
                  className="timeline-segment"
                />
              </g>
            </Tooltip>
          )
        })}

        {/* Draw points with tooltips */}
        {points.map((point, index) => {
          const { date, outcome, x } = point
          const colors = getOutcomeColor(outcome)
          const graduated =
            trialTimes.done && outcome === "good" && index === points.length - 1
          const icon = (
            <IconForOutcome outcome={outcome} graduated={graduated} />
          )
          const isHovered = hoveredIndex === index

          return (
            <Tooltip
              key={`point-${index}`}
              title={
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontSize: "0.875rem",
                  }}
                >
                  {icon}
                  <Box
                    component="div"
                    sx={{ fontWeight: "bold", color: "text.secondary" }}
                  >
                    {formatDate(date)}
                  </Box>
                </Box>
              }
              arrow
              placement="top"
              enterDelay={200}
              slotProps={{
                popper: {
                  modifiers: [
                    {
                      name: "offset",
                      options: {
                        offset: [0, -8],
                      },
                    },
                  ],
                },
                tooltip: {
                  sx: {
                    bgcolor: "background.paper",
                    color: "text.primary",
                    border: "1px solid",
                    borderColor: theme.palette.grey[700],
                    "& .MuiTooltip-arrow": {
                      color: theme.palette.grey[700],
                    },
                  },
                },
              }}
            >
              <TimelinePointGroup
                transform={`translate(${x + outerRadius}, ${y})`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Background ring (outermost) - appears on hover */}
                <circle
                  r={bullseyeRadius}
                  fill="none"
                  stroke={theme.palette.background.paper}
                  strokeWidth={ringWidth}
                  className="bullseye-bg-outer"
                  style={{ opacity: isHovered ? 1 : 0 }}
                />
                {/* Dot color ring */}
                <circle
                  r={bullseyeRadius - ringWidth}
                  fill="none"
                  stroke={colors.color}
                  strokeWidth={ringWidth}
                  className="bullseye-dot-ring"
                  style={{ opacity: isHovered ? 1 : 0 }}
                />
                {/* Background ring (inner) */}
                <circle
                  r={bullseyeRadius - ringWidth * 2}
                  fill="none"
                  stroke={theme.palette.background.paper}
                  strokeWidth={ringWidth}
                  className="bullseye-bg-inner"
                  style={{ opacity: isHovered ? 1 : 0 }}
                />
                {/* The dot itself */}
                <circle
                  r={dotRadius}
                  fill={colors.color}
                  stroke={theme.palette.background.paper}
                  strokeWidth={2}
                  className="timeline-dot"
                />
              </TimelinePointGroup>
            </Tooltip>
          )
        })}
      </svg>
    </TimelineContainer>
  )
}
