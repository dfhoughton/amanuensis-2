import type { Meta, StoryObj } from '@storybook/react'
import { TagChip } from './TagChip'
import { Tag } from '../types/common'

const meta: Meta<typeof TagChip> = {
  title: 'Components/TagChip',
  component: TagChip,
  argTypes: {
    tag: {
      description: 'The tag to display',
      control: { type: 'object' },
    },
    onClick: {
      description: 'Click handler',
      action: 'clicked',
    },
    onDelete: {
      description: 'Delete handler',
      action: 'deleted',
    },
    arrowPosition: {
      description: 'Tooltip arrow position',
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
    },
  },
}

export default meta

type Story = StoryObj<typeof TagChip>

const sampleTag: Tag = {
  name: 'Sample Tag',
  color: '#2196F3',
  bgcolor: '#E3F2FD',
  description: 'This is a sample tag with a description',
}

const simpleTag: Tag = {
  name: 'Simple Tag',
  color: '#4CAF50',
  bgcolor: '#E8F5E9',
}

export const Default: Story = {
  args: {
    tag: sampleTag,
  },
}

export const WithoutDescription: Story = {
  args: {
    tag: simpleTag,
  },
}

export const WithDelete: Story = {
  args: {
    tag: sampleTag,
    onDelete: () => console.log('Delete clicked'),
  },
}

export const WithClickHandler: Story = {
  args: {
    tag: sampleTag,
    onClick: () => console.log('Chip clicked'),
  },
}

export const AllFeatures: Story = {
  args: {
    tag: sampleTag,
    onClick: () => console.log('Chip clicked'),
    onDelete: () => console.log('Delete clicked'),
    arrowPosition: 'bottom',
  },
}
