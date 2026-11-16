import "foliate-js/view.js";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ChevronLeft, ChevronRight, List, Settings2, X } from "lucide-react";
import { useThemeMode } from "../providers/theme-provider";
import { getBookFile, useLibrary } from "../services/library";
import { useReaderSettings } from "../services/reader-settings";

export const Route = createFileRoute("/reader/$bookId")({ component: ReaderPage });

type TocItem = { label: string; href: string; subitems?: TocItem[] };
type FoliateView = HTMLElement & { open: (file: File) => Promise<void>; init: (options: { lastLocation?: string; showTextStart: boolean }) => Promise<void>; goLeft: () => Promise<void>; goRight: () => Promise<void>; goTo: (href: string) => Promise<void>; book?: { toc?: TocItem[]; metadata?: { title?: unknown } }; renderer?: { setStyles?: (css: string) => void }; close: () => void };
function readerCss(fontScale: number, lineHeight: number, paragraphSpacing: number, justify: boolean, theme: "light" | "dark") {
  const root = getComputedStyle(document.documentElement);
  const background = root.getPropertyValue("--color-background-body").trim();
  const foreground = root.getPropertyValue("--color-text-primary").trim();
  const accent = root.getPropertyValue("--color-accent").trim();
  return `html {
    color-scheme: ${theme};
    --theme-bg-color: ${background};
    background-color: ${background};
    color: ${foreground};
    font-size: ${fontScale}em;
  }
  h1, h2, h3, h4, h5, h6 { color: ${foreground}; }
  a { color: ${accent}; }
  p, li, blockquote { line-height: ${lineHeight}; margin-block: ${paragraphSpacing}em; text-align: ${justify ? "justify" : "start"}; }
  img, svg { max-width: 100%; height: auto; }`;
}
function flattenToc(items: TocItem[]): TocItem[] { return items.flatMap((item) => [item, ...flattenToc(item.subitems ?? [])]); }

function ReaderPage() {
  const { bookId } = Route.useParams();
  const navigate = useNavigate();
  const book = useLibrary((state) => state.books.find((item) => item.id === bookId));
  const isReady = useLibrary((state) => state.isReady);
  const updateProgress = useLibrary((state) => state.updateProgress);
  const settings = useReaderSettings();
  const { theme } = useThemeMode();
  const hostRef = useRef<HTMLElement>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const [toc, setToc] = useState<TocItem[]>([]);
  const [progress, setProgress] = useState(book?.progress ?? 0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const selectedBook = useLibrary.getState().books.find((item) => item.id === bookId);
    if (!selectedBook) { if (isReady) void navigate({ to: "/" }); return; }
    if (selectedBook.format === "TXT") { setStatus("ready"); return; }
    let cancelled = false;
    let saveTimer: number | undefined;
    const open = async () => {
      try {
        const stored = await getBookFile(selectedBook.id);
        if (!stored || cancelled) throw new Error("找不到本地书籍文件，请重新导入。");
        const file = new File([stored.file], `${selectedBook.title}.epub`, { type: "application/epub+zip" });
        const view = document.createElement("foliate-view") as FoliateView;
        view.addEventListener("relocate", ((event: CustomEvent<{ fraction?: number; cfi?: string }>) => {
          const nextProgress = Math.round((event.detail.fraction ?? 0) * 100);
          setProgress(nextProgress);
          window.clearTimeout(saveTimer);
          saveTimer = window.setTimeout(() => updateProgress(selectedBook.id, nextProgress, event.detail.cfi), 800);
        }) as EventListener);
        hostRef.current?.append(view);
        viewRef.current = view;
        await view.open(file);
        view.renderer?.setStyles?.(readerCss(settings.fontScale, settings.lineHeight, settings.paragraphSpacing, settings.justify, themeRef.current));
        await view.init({ lastLocation: selectedBook.cfi, showTextStart: true });
        if (!cancelled) { setToc(view.book?.toc ?? []); setStatus("ready"); }
      } catch (reason) { if (!cancelled) { setError(reason instanceof Error ? reason.message : "无法打开这本 EPUB。"); setStatus("error"); } }
    };
    void open();
    return () => { cancelled = true; window.clearTimeout(saveTimer); viewRef.current?.close(); viewRef.current?.remove(); viewRef.current = null; };
  }, [bookId, book?.format, isReady, navigate, settings.fontScale, settings.justify, settings.lineHeight, settings.paragraphSpacing, updateProgress]);

  // Recolor the already-open EPUB when the theme changes; no need to re-open it.
  useEffect(() => {
    viewRef.current?.renderer?.setStyles?.(readerCss(settings.fontScale, settings.lineHeight, settings.paragraphSpacing, settings.justify, theme));
  }, [theme, settings.fontScale, settings.lineHeight, settings.paragraphSpacing, settings.justify]);

  if (!book) return <VStack className="reader-page" align="center" justify="center" gap={2}><Heading level={4}>正在打开书籍</Heading></VStack>;
  const textReader = book.format === "TXT";
  return <VStack className="reader-page" gap={0}>
    <HStack className="reader-topbar" align="center" justify="between" gap={3}><HStack className="reader-progress-group" align="center" gap={2}><progress className="reader-progress" value={progress} max="100" /><Text type="supporting" color="secondary">{Math.round(progress)}%</Text></HStack><HStack gap={1}><IconButton label="目录" variant="ghost" icon={<Icon icon={List} />} onClick={() => setIsTocOpen(true)} /><IconButton label="阅读设置" variant="ghost" icon={<Icon icon={Settings2} />} onClick={() => setIsSettingsOpen(true)} /></HStack></HStack>
    {isTocOpen ? <section className="reader-panel" aria-label="目录"><HStack align="center" justify="between"><Heading level={4}>目录</Heading><IconButton label="关闭目录" variant="ghost" icon={<Icon icon={X} />} onClick={() => setIsTocOpen(false)} /></HStack><VStack gap={1}>{flattenToc(toc).map((item) => <Button key={item.href} label={item.label} variant="ghost" onClick={() => { void viewRef.current?.goTo(item.href); setIsTocOpen(false); }} />)}{!toc.length ? <Text type="body" color="secondary">这本书没有目录。</Text> : null}</VStack></section> : null}
    {isSettingsOpen ? <section className="reader-panel reader-settings-panel" aria-label="阅读设置"><HStack align="center" justify="between"><Heading level={4}>阅读设置</Heading><IconButton label="关闭阅读设置" variant="ghost" icon={<Icon icon={X} />} onClick={() => setIsSettingsOpen(false)} /></HStack><VStack gap={3}><HStack align="center" justify="between"><Text type="body">字号</Text><HStack gap={1}><Button label="A−" size="sm" variant="secondary" onClick={() => settings.update({ fontScale: Math.max(0.8, Number((settings.fontScale - 0.1).toFixed(1))) })} /><Button label="A+" size="sm" variant="secondary" onClick={() => settings.update({ fontScale: Math.min(1.5, Number((settings.fontScale + 0.1).toFixed(1))) })} /></HStack></HStack><HStack align="center" justify="between"><Text type="body">两端对齐</Text><Button label={settings.justify ? "已开启" : "已关闭"} size="sm" variant="secondary" onClick={() => settings.update({ justify: !settings.justify })} /></HStack></VStack></section> : null}
    {textReader ? null : <section ref={hostRef} className="foliate-host" aria-label="EPUB 阅读区" />}
    {textReader ? <TextReader bookId={book.id} /> : null}
    {status === "loading" ? <VStack className="reader-state" align="center" justify="center" gap={2}><Heading level={4}>正在排版</Heading><Text type="body" color="secondary">首次打开会根据当前字体生成分页。</Text></VStack> : null}
    {status === "error" ? <VStack className="reader-state" align="center" justify="center" gap={3}><Heading level={4}>无法打开 EPUB</Heading><Text type="body" color="secondary">{error}</Text><Button label="返回详情" onClick={() => void navigate({ to: "/book/$bookId", params: { bookId } })} /></VStack> : null}
    <HStack className="reader-controls" align="center" justify="between"><IconButton label="上一页" variant="ghost" icon={<Icon icon={ChevronLeft} />} onClick={() => void viewRef.current?.goLeft()} /><progress className="reader-progress" value={progress} max="100" /><IconButton label="下一页" variant="ghost" icon={<Icon icon={ChevronRight} />} onClick={() => void viewRef.current?.goRight()} /></HStack>
  </VStack>;
}

function TextReader({ bookId }: { bookId: string }) {
  const [text, setText] = useState("");
  useEffect(() => { void getBookFile(bookId).then((file) => file?.file.text().then(setText)); }, [bookId]);
  return <section className="text-reader" aria-label="TXT 正文">{text.split(/\r?\n/).filter(Boolean).map((paragraph, index) => <Text key={index} className="text-reader-paragraph" type="body" display="block">{paragraph}</Text>)}</section>;
}
