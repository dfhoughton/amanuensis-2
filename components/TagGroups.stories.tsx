import type { Meta, StoryObj } from '@storybook/react-vite'
import { TagGroups } from './TagGroups'
import { TagGroup, Tag, Language } from '../types/common'
import type { Action } from '../util/reducer'

const meta: Meta<typeof TagGroups> = {
  title: 'Components/TagGroups',
  component: TagGroups,
  argTypes: {
    groups: {
      description: 'Array of tag groups to display',
      control: { type: 'object' },
    },
    tags: {
      description: 'Array of tags (used for conflict checking)',
      control: { type: 'object' },
    },
    languages: {
      description: 'Array of languages available',
      control: { type: 'object' },
    },
    bumpVersion: {
      description: 'Callback to refresh data',
      action: 'bumpVersion',
    },
    dispatch: {
      description: 'Redux-like dispatch function',
      action: 'dispatch',
    },
  },
}

export default meta

type Story = StoryObj<typeof TagGroups>

// Sample data for stories
const sampleLanguages: Language[] = [
  {
    id: 1,
    name: 'English',
    locale: 'en',
    locales: { en: 10 },
    count: 100,
  },
  {
    id: 2,
    name: 'French',
    locale: 'fr',
    locales: { fr: 8 },
    count: 50,
  },
  {
    id: 3,
    name: 'German',
    locale: 'de',
    locales: { de: 5 },
    count: 25,
  },
]

const sampleTags: Tag[] = [
  {
    id: 1,
    name: 'Noun',
    description: 'Nouns and pronouns',
    groupId: 1,
    color: '#2196F3',
    bgcolor: '#E3F2FD',
  },
  {
    id: 2,
    name: 'Verb',
    description: 'Verbs and verb phrases',
    groupId: 1,
    color: '#4CAF50',
    bgcolor: '#E8F5E9',
  },
  {
    id: 3,
    name: 'Important',
    description: 'High priority items',
    groupId: 2,
    color: '#F44336',
    bgcolor: '#FFEBEE',
  },
]

const sampleGroups: TagGroup[] = [
  {
    id: 1,
    name: 'Parts of Speech',
    description: 'Grammatical categories',
    color: '#2196F3',
    bgcolor: '#E3F2FD',
    languages: [1, 2],
    order: 0,
  },
  {
    id: 2,
    name: 'Priority',
    description: 'Importance levels',
    color: '#F44336',
    bgcolor: '#FFEBEE',
    languages: [1],
    order: 1,
  },
  {
    id: 3,
    name: 'default',
    description: 'the tag group holding tags without a more specific group',
    color: '#9E9E9E',
    bgcolor: '#F5F5F5',
    order: 2,
  },
  {
    id: 4,
    name: 'Technical Terms',
    description: 'Domain-specific terminology with long description text',
    color: '#9C27B0',
    bgcolor: '#F3E5F5',
    languages: [2, 3],
    order: 3,
  },
]

// Helper functions for the stories
const noop = () => {}
const noopDispatch = (_action: Action) => {}

// Wrapper component that provides the required callbacks
export const Default: Story = {
  args: {
    groups: sampleGroups,
    tags: sampleTags,
    languages: sampleLanguages,
    bumpVersion: noop,
    dispatch: noopDispatch,
  },
}

export const SingleGroup: Story = {
  args: {
    groups: [sampleGroups[0]],
    tags: sampleTags,
    languages: sampleLanguages,
    bumpVersion: noop,
    dispatch: noopDispatch,
  },
}

export const MultipleGroups: Story = {
  args: {
    groups: sampleGroups,
    tags: sampleTags,
    languages: sampleLanguages,
    bumpVersion: noop,
    dispatch: noopDispatch,
  },
}

export const GroupsWithLongNames: Story = {
  args: {
    groups: [
      {
        id: 1,
        name: 'Very Long Group Name That Should Wrap Or Truncate',
        description: 'This is a group with an extremely long name to test how it handles overflow',
        color: '#2196F3',
        bgcolor: '#E3F2FD',
        languages: [1],
        order: 0,
      },
      {
        id: 2,
        name: 'Another Extended Group Title',
        description: 'Another group with a long name',
        color: '#4CAF50',
        bgcolor: '#E8F5E9',
        order: 1,
      },
      {
        id: 3,
        name: 'Short',
        color: '#FF9800',
        bgcolor: '#FFF3E0',
        order: 2,
      },
    ],
    tags: sampleTags,
    languages: sampleLanguages,
    bumpVersion: noop,
    dispatch: noopDispatch,
  },
}

export const GroupsWithLongDescriptions: Story = {
  args: {
    groups: [
      {
        id: 1,
        name: 'Group 1',
        description: 'This is a very long description that is displayed only via tooltip on hover to prevent layout infelicities',
        color: '#2196F3',
        bgcolor: '#E3F2FD',
        languages: [1, 2, 3],
        order: 0,
      },
      {
        id: 2,
        name: 'Group 2',
        description: 'Another extended description text displayed via tooltip',
        color: '#4CAF50',
        bgcolor: '#E8F5E9',
        languages: [1],
        order: 1,
      },
      {
        id: 3,
        name: 'Group 3',
        description: 'Short',
        color: '#FF9800',
        bgcolor: '#FFF3E0',
        order: 2,
      },
    ],
    tags: sampleTags,
    languages: sampleLanguages,
    bumpVersion: noop,
    dispatch: noopDispatch,
  },
}

export const ColorVariations: Story = {
  args: {
    groups: [
      {
        id: 1,
        name: 'Blue Group',
        description: 'Blue theme',
        color: '#1976D2',
        bgcolor: '#E3F2FD',
        languages: [1],
        order: 0,
      },
      {
        id: 2,
        name: 'Green Group',
        description: 'Green theme',
        color: '#2E7D32',
        bgcolor: '#E8F5E9',
        languages: [1],
        order: 1,
      },
      {
        id: 3,
        name: 'Red Group',
        description: 'Red theme',
        color: '#C62828',
        bgcolor: '#FFEBEE',
        languages: [1],
        order: 2,
      },
      {
        id: 4,
        name: 'Purple Group',
        description: 'Purple theme',
        color: '#7B1FA2',
        bgcolor: '#F3E5F5',
        languages: [1],
        order: 3,
      },
      {
        id: 5,
        name: 'Orange Group',
        description: 'Orange theme',
        color: '#E65100',
        bgcolor: '#FFF3E0',
        languages: [1],
        order: 4,
      },
    ],
    tags: sampleTags,
    languages: sampleLanguages,
    bumpVersion: noop,
    dispatch: noopDispatch,
  },
}

export const WithMultipleLanguages: Story = {
  args: {
    groups: [
      {
        id: 1,
        name: 'English',
        description: 'English language tags',
        color: '#2196F3',
        bgcolor: '#E3F2FD',
        languages: [1],
        order: 0,
      },
      {
        id: 2,
        name: 'French and German',
        description: 'French and German tags',
        color: '#4CAF50',
        bgcolor: '#E8F5E9',
        languages: [2, 3],
        order: 1,
      },
      {
        id: 3,
        name: 'Multilingual',
        description: 'All languages',
        color: '#9C27B0',
        bgcolor: '#F3E5F5',
        languages: [1, 2, 3],
        order: 2,
      },
    ],
    tags: sampleTags,
    languages: sampleLanguages,
    bumpVersion: noop,
    dispatch: noopDispatch,
  },
}

export const EmptyGroups: Story = {
  args: {
    groups: [],
    tags: sampleTags,
    languages: sampleLanguages,
    bumpVersion: noop,
    dispatch: noopDispatch,
  },
}
