import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CourseFileNodeView } from './CourseFileNodeView'

export const CourseFile = Node.create({
  name: 'courseFile',
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
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-file-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CourseFileNodeView)
  },
})
