"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageSelector } from "@/components/image-selector";
import type { ImageValue } from "@/lib/types";
import {
  IconBold,
  IconItalic,
  IconStrikethrough,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconList,
  IconListNumbers,
  IconQuote,
  IconLink,
  IconPhoto,
  IconArrowBack,
  IconArrowForward,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "Nhập nội dung blog...",
  className,
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-md",
        },
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
          "focus:outline-none min-h-[300px] p-4 text-foreground",
          "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4",
          "[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3",
          "[&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2",
          "[&_p]:mb-4 [&_p]:leading-relaxed",
          "[&_strong]:font-bold [&_strong]:text-foreground",
          "[&_em]:italic [&_em]:text-foreground",
          "[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono",
          "[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-md [&_pre]:overflow-x-auto",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4",
          "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-4",
          "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-4",
          "[&_li]:my-2",
          "[&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800",
          "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-4"
        ),
      },
    },
  });

  const [imageSelectorKey, setImageSelectorKey] = useState(0);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className={cn("border rounded-md min-h-[300px] p-4", className)}>
        <div className="text-muted-foreground">Đang tải editor...</div>
      </div>
    );
  }

  const handleImageSelect = (value: ImageValue | undefined) => {
    if (value && editor) {
      editor.chain().focus().setImage({ src: value.url }).run();
      // Reset ImageSelector to allow selecting again
      setImageSelectorKey((prev) => prev + 1);
    }
  };

  const addImage = () => {
    // Find and click the ImageSelector button in the hidden container
    setTimeout(() => {
      const container = document.getElementById(
        `hidden-image-selector-${imageSelectorKey}`
      );
      if (container) {
        const button = container.querySelector(
          'button[type="button"]'
        ) as HTMLButtonElement;
        if (button) {
          button.click();
        }
      }
    }, 0);
  };

  const addLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Nhập URL:", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("code") && "bg-muted")}
          >
            <IconCode className="size-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("heading", { level: 1 }) && "bg-muted"
            )}
          >
            <IconH1 className="size-4" />
          </Button>
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              editor.chain().focus().toggleList("orderedList", "listItem").run()
            }
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("orderedList") && "bg-muted"
            )}
          >
            <IconListNumbers className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("blockquote") && "bg-muted"
            )}
          >
            <IconQuote className="size-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addLink}
            className={cn("h-8 w-8 p-0", editor.isActive("link") && "bg-muted")}
          >
            <IconLink className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addImage}
            className="h-8 w-8 p-0"
          >
            <IconPhoto className="size-4" />
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

      {/* Hidden ImageSelector to use its dialog */}
      <div id={`hidden-image-selector-${imageSelectorKey}`} className="sr-only">
        <ImageSelector
          key={imageSelectorKey}
          value={undefined}
          onChange={handleImageSelect}
          label=""
          description=""
        />
      </div>
    </div>
  );
}
