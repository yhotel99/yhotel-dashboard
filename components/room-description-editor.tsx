"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconH2,
  IconH3,
  IconList,
  IconArrowBack,
  IconArrowForward,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconAlignJustified,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface RoomDescriptionEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function RoomDescriptionEditor({
  content,
  onChange,
  placeholder = "Mô tả chi tiết về phòng...",
  className,
  editable = true,
}: RoomDescriptionEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        orderedList: false,
        blockquote: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "focus:outline-none min-h-[200px] p-4 text-foreground",
          "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3",
          "[&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2",
          "[&_p]:mb-4 [&_p]:leading-relaxed",
          "[&_strong]:font-bold [&_strong]:text-foreground",
          "[&_em]:italic [&_em]:text-foreground",
          "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-4",
          "[&_li]:my-2"
        ),
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className={cn("border rounded-md min-h-[200px] p-4", className)}>
        <div className="text-muted-foreground">Đang tải editor...</div>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-md", className)}>
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("bold") && "bg-muted")}
          >
            <IconBold className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("italic") && "bg-muted"
            )}
          >
            <IconItalic className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("strike") && "bg-muted"
            )}
          >
            <IconStrikethrough className="size-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("heading", { level: 2 }) && "bg-muted"
            )}
          >
            <IconH2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("heading", { level: 3 }) && "bg-muted"
            )}
          >
            <IconH3 className="size-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleList("bulletList", "listItem").run()
            }
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("bulletList") && "bg-muted"
            )}
          >
            <IconList className="size-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive({ textAlign: "left" }) && "bg-muted"
            )}
          >
            <IconAlignLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive({ textAlign: "center" }) && "bg-muted"
            )}
          >
            <IconAlignCenter className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive({ textAlign: "right" }) && "bg-muted"
            )}
          >
            <IconAlignRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              editor.chain().focus().setTextAlign("justify").run()
            }
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive({ textAlign: "justify" }) && "bg-muted"
            )}
          >
            <IconAlignJustified className="size-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0"
          >
            <IconArrowBack className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 w-8 p-0"
          >
            <IconArrowForward className="size-4" />
          </Button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

