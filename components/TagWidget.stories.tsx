import type { Meta, StoryObj } from '@storybook/react-vite'
import { TagWidget } from './TagWidget'
import { Tag } from '../types/common'

const meta: Meta<typeof TagWidget> = {
  title: 'Components/TagWidget',
  component: TagWidget,
  argTypes: {
    tags: {
      description: 'Available tags to choose from',
      control: { type: 'object' },
    },
    languageIds: {
      description: 'Language IDs for filtering tags',
      control: { type: 'object' },
    },
    presentTags: {
      description: 'Currently selected tag IDs',
      control: { type: 'object' },
    },
    addTag: {
      description: 'Callback when a tag is added',
      action: 'added',
    },
    removeTag: {
      description: 'Callback when a tag is removed',
      action: 'removed',
    },
    onClick: {
      description: 'Click handler for tags',
      action: 'clicked',
    },
  },
}

export default meta

type Story = StoryObj<typeof TagWidget>

const sampleTags: Tag[] = [
  {
    id: 1,
    name: 'Noun',
    description: 'Nouns and pronouns',
    color: '#2196F3',
    bgcolor: '#E3F2FD',
  },
  {
    id: 2,
    name: 'Verb',
    description: 'Verbs and verb phrases',
    color: '#4CAF50',
    bgcolor: '#E8F5E9',
  },
  {
    id: 3,
    name: 'Adjective',
    description: 'Adjectives and adverbs',
    color: '#FF9800',
    bgcolor: '#FFF3E0',
  },
  {
    id: 4,
    name: 'Important',
    description: 'High priority items',
    color: '#F44336',
    bgcolor: '#FFEBEE',
    languages: [1],
  },
  {
    id: 5,
    name: 'Technical',
    description: 'Technical terms',
    color: '#9C27B0',
    bgcolor: '#F3E5F5',
    languages: [1],
  },
]

export const Empty: Story = {
  args: {
    tags: sampleTags,
    languageIds: [],
    presentTags: [],
    addTag: (tag) => console.log('Added:', tag.name),
    removeTag: (tag) => console.log('Removed:', tag.name),
  },
}

export const WithSelectedTags: Story = {
  args: {
    tags: sampleTags,
    languageIds: [],
    presentTags: [1, 2],
    addTag: (tag) => console.log('Added:', tag.name),
    removeTag: (tag) => console.log('Removed:', tag.name),
  },
}

export const WithLanguageFilter: Story = {
  args: {
    tags: sampleTags,
    languageIds: [1], // Only tags with language 1 will be available
    presentTags: [],
    addTag: (tag) => console.log('Added:', tag.name),
    removeTag: (tag) => console.log('Removed:', tag.name),
  },
}

export const AllTagsSelected: Story = {
  args: {
    tags: sampleTags,
    languageIds: [],
    presentTags: [1, 2, 3, 4, 5],
    addTag: (tag) => console.log('Added:', tag.name),
    removeTag: (tag) => console.log('Removed:', tag.name),
  },
}

export const WithClickHandler: Story = {
  args: {
    tags: sampleTags,
    languageIds: [],
    presentTags: [1, 3],
    addTag: (tag) => console.log('Added:', tag.name),
    removeTag: (tag) => console.log('Removed:', tag.name),
    onClick: (tag) => () => console.log('Clicked:', tag.name),
  },
}
