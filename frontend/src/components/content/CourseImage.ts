import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CourseImageNodeView } from './CourseImageNodeView'

export const CourseImage = Node.create({
  name: 'courseImage',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      fileId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-file-id'),
        renderHTML: (attributes) => ({ 'data-file-id': attributes.fileId }),
      },
      alt: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-alt'),
        renderHTML: (attributes) => ({ 'data-alt': attributes.alt }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-file-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CourseImageNodeView)
  },
})
