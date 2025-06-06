import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Bold from '@tiptap/extension-bold'
import Heading from '@tiptap/extension-heading'
import Italic from '@tiptap/extension-italic'
import React from 'react';

const RichTextEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Bold,
      Italic,
      Heading.configure({
        levels: [1, 2],
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
  })

  return (
    <div className="tiptap-editor">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

const MenuBar = ({ editor }) => {
  if (!editor) return null

  return (
    <div className="menu-bar">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
      >
        Italic
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
      >
        H2
      </button>
    </div>
  )
};

export default RichTextEditor;