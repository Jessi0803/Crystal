import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { compressImage } from "@/lib/imageCompression";
import { normalizeImageUrl } from "@/lib/purchaseOptions";
import { benefitsEditorExtensions } from "@/lib/richTextExtensions";
import {
  RICH_TEXT_COLORS,
  RICH_TEXT_FONT_SIZES,
  RICH_TEXT_IMAGE_SIZES,
  isSafeImageSrc,
  isSafeLinkHref,
  toRichTextHtml,
  type RichTextAlignment,
} from "@shared/richText";

const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;

const selectClass =
  "h-8 border border-[oklch(0.86_0_0)] bg-white px-1.5 text-xs font-body text-[oklch(0.3_0_0)] outline-none focus:border-[oklch(0.2_0_0)]";
const inputClass =
  "h-8 min-w-0 flex-1 border border-[oklch(0.86_0_0)] bg-white px-2 text-xs font-body outline-none focus:border-[oklch(0.2_0_0)]";
const smallButtonClass =
  "h-8 shrink-0 border border-[oklch(0.86_0_0)] bg-white px-2.5 text-xs font-body text-[oklch(0.3_0_0)] hover:border-[oklch(0.2_0_0)] disabled:opacity-50";

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // 避免按鈕搶走焦點導致 Editor 選取範圍消失
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center px-1.5 text-[oklch(0.3_0_0)] transition-colors disabled:opacity-35 ${
        active ? "bg-[oklch(0.2_0_0)] text-white" : "hover:bg-[oklch(0.93_0_0)]"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-[oklch(0.86_0_0)]" aria-hidden="true" />;
}

function normalizeLinkInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

type Panel = "link" | "image" | null;

function useToolbarState(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      block: current.isActive("heading", { level: 2 }) ? "h2" : current.isActive("heading", { level: 3 }) ? "h3" : "p",
      fontSize: (current.getAttributes("rtFontSize").size as number | null) ?? null,
      color: (current.getAttributes("rtColor").color as string | null) ?? null,
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      link: current.isActive("link"),
      linkHref: (current.getAttributes("link").href as string | undefined) ?? "",
      image: current.isActive("image"),
      imageAttrs: current.getAttributes("image") as { src?: string; alt?: string | null; align?: RichTextAlignment; size?: string },
      textAlign: (["center", "right"] as const).find((align) => current.isActive({ textAlign: align })) ?? "left",
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });
}

function Toolbar({ editor, onPickImage, uploading }: { editor: Editor; onPickImage: () => void; uploading: boolean }) {
  const state = useToolbarState(editor);
  const [panel, setPanel] = useState<Panel>(null);
  const [linkValue, setLinkValue] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const togglePanel = (next: Panel) => {
    setPanel((current) => (current === next ? null : next));
    if (next === "link") setLinkValue(state.linkHref);
    if (next === "image") setImageUrl("");
  };

  const applyLink = () => {
    const href = normalizeLinkInput(linkValue);
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setPanel(null);
      return;
    }
    if (!isSafeLinkHref(href)) {
      toast.error("連結只接受 http、https 或 mailto 開頭的網址");
      return;
    }
    const { empty } = editor.state.selection;
    if (empty && !state.link) {
      // 沒有選取文字時，直接插入網址本身作為連結文字
      editor.chain().focus().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setPanel(null);
  };

  const insertImageUrl = () => {
    const src = normalizeImageUrl(imageUrl);
    if (!isSafeImageSrc(src)) {
      toast.error("請輸入 https 開頭的圖片網址");
      return;
    }
    editor.chain().focus().setImage({ src }).run();
    setPanel(null);
  };

  const setAlign = (align: RichTextAlignment) => {
    if (state.image) editor.chain().focus().updateAttributes("image", { align }).run();
    else editor.chain().focus().setTextAlign(align).run();
  };
  const currentAlign = state.image ? state.imageAttrs.align ?? "center" : state.textAlign;

  return (
    <div className="sticky top-0 z-10 border border-b-0 border-[oklch(0.86_0_0)] bg-[oklch(0.985_0_0)]">
      <div className="flex flex-wrap items-center gap-1 px-1.5 py-1.5">
        <select
          aria-label="段落格式"
          value={state.block}
          onChange={(event) => {
            const value = event.target.value;
            const chain = editor.chain().focus();
            if (value === "p") chain.setParagraph().run();
            else chain.setHeading({ level: value === "h2" ? 2 : 3 }).run();
          }}
          className={selectClass}
        >
          <option value="p">段落</option>
          <option value="h2">標題 H2</option>
          <option value="h3">小標題 H3</option>
        </select>
        <select
          aria-label="字級"
          value={state.fontSize ?? ""}
          onChange={(event) => {
            const size = Number(event.target.value);
            const chain = editor.chain().focus();
            if (size) chain.setMark("rtFontSize", { size }).run();
            else chain.unsetMark("rtFontSize").run();
          }}
          className={selectClass}
        >
          <option value="">預設字級</option>
          {RICH_TEXT_FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
        <select
          aria-label="文字顏色"
          value={state.color ?? ""}
          onChange={(event) => {
            const color = event.target.value;
            const chain = editor.chain().focus();
            if (color) chain.setMark("rtColor", { color }).run();
            else chain.unsetMark("rtColor").run();
          }}
          className={selectClass}
        >
          <option value="">預設文字色</option>
          {RICH_TEXT_COLORS.map((color) => (
            <option key={color.id} value={color.id}>
              {color.label}
            </option>
          ))}
        </select>
        <Divider />
        <ToolButton label="粗體" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="斜體" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="底線" active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="刪除線" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton label={state.image ? "圖片靠左" : "靠左對齊"} active={currentAlign === "left"} onClick={() => setAlign("left")}>
          <AlignLeft className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={state.image ? "圖片置中" : "置中對齊"} active={currentAlign === "center"} onClick={() => setAlign("center")}>
          <AlignCenter className="h-4 w-4" />
        </ToolButton>
        <ToolButton label={state.image ? "圖片靠右" : "靠右對齊"} active={currentAlign === "right"} onClick={() => setAlign("right")}>
          <AlignRight className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton label="項目符號清單" active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="編號清單" active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton label="超連結" active={state.link || panel === "link"} onClick={() => togglePanel("link")}>
          <Link2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="插入圖片" active={panel === "image"} disabled={uploading} onClick={() => togglePanel("image")}>
          <ImagePlus className="h-4 w-4" />
        </ToolButton>
        <Divider />
        <ToolButton label="復原" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="重做" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="清除格式"
          onClick={() => editor.chain().focus().unsetAllMarks().unsetTextAlign().run()}
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolButton>
      </div>

      {panel === "link" && (
        <div className="flex items-center gap-1.5 border-t border-[oklch(0.9_0_0)] px-2 py-2">
          <input
            autoFocus
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://… 或 mailto:…"
            className={inputClass}
          />
          <button type="button" onClick={applyLink} className={smallButtonClass}>
            套用
          </button>
          {state.link && (
            <button
              type="button"
              title="移除連結"
              onClick={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                setPanel(null);
              }}
              className={smallButtonClass}
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {panel === "image" && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[oklch(0.9_0_0)] px-2 py-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              setPanel(null);
              onPickImage();
            }}
            className={smallButtonClass}
          >
            {uploading ? "上傳中…" : "從電腦選擇圖片"}
          </button>
          <span className="text-[11px] font-body text-[oklch(0.55_0_0)]">或</span>
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                insertImageUrl();
              }
            }}
            placeholder="貼上圖片網址（可用 Google Drive 連結）"
            className={inputClass}
          />
          <button type="button" onClick={insertImageUrl} className={smallButtonClass}>
            插入
          </button>
        </div>
      )}

      {state.image && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[oklch(0.9_0_0)] bg-white px-2 py-2">
          <span className="text-[11px] tracking-widest font-body text-[oklch(0.5_0_0)]">圖片大小</span>
          {RICH_TEXT_IMAGE_SIZES.map((size) => (
            <button
              key={size.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor.chain().focus().updateAttributes("image", { size: size.id }).run()}
              className={`${smallButtonClass} ${
                (state.imageAttrs.size ?? "md") === size.id ? "!border-[oklch(0.2_0_0)] !bg-[oklch(0.2_0_0)] !text-white" : ""
              }`}
            >
              {size.label}
            </button>
          ))}
          <input
            key={state.imageAttrs.src}
            defaultValue={state.imageAttrs.alt ?? ""}
            onBlur={(event) => editor.chain().updateAttributes("image", { alt: event.target.value.trim() || null }).run()}
            placeholder="替代文字（描述圖片內容）"
            className={`${inputClass} min-w-[10rem]`}
          />
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().deleteSelection().run()}
            className={`${smallButtonClass} flex items-center gap-1 text-red-700`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            刪除圖片
          </button>
        </div>
      )}
    </div>
  );
}

type BenefitsEditorProps = {
  value: string;
  onChange: (html: string) => void;
};

/** 一般商品「功效說明」的富文字編輯器 */
export default function BenefitsEditor({ value, onChange }: BenefitsEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef(value);
  const [uploading, setUploading] = useState(false);
  const uploadImage = trpc.product.uploadRichTextImage.useMutation();

  const editor = useEditor({
    extensions: benefitsEditorExtensions,
    content: toRichTextHtml(value),
    editorProps: {
      attributes: {
        class: "rich-content rich-content-editor",
        "aria-label": "功效說明",
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = current.isEmpty ? "" : current.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // 外部改變內容時（例如切換商品）同步進 Editor
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(toRichTextHtml(value), { emitUpdate: false });
  }, [editor, value]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔");
      return;
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      toast.error("每張圖片請小於 10MB");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await compressImage(file, { maxSize: 1600, quality: 0.82 });
      const { url } = await uploadImage.mutateAsync({
        contentType: "image/jpeg",
        dataBase64: dataUrl.slice(dataUrl.indexOf(",") + 1),
      });
      editor.chain().focus().setImage({ src: url, alt: file.name.replace(/\.[^.]+$/, "") }).run();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "圖片上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  if (!editor) return null;

  return (
    <div>
      <Toolbar editor={editor} uploading={uploading} onPickImage={() => fileInputRef.current?.click()} />
      <EditorContent editor={editor} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
