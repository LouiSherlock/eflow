import "foliate-js/view.js";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { List, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { SecondaryAppBar } from "../components/secondary-app-bar";
import { useThemeMode } from "../providers/theme-provider";
import { getBookFile, useLibrary } from "../services/library";
import { useReaderSettings } from "../services/reader-settings";

export const Route = createFileRoute("/reader/$bookId")({ component: ReaderPage });

type TocItem = { label: string; href: string; subitems?: TocItem[] };
type FlatTocItem = TocItem & { depth: number };
type RelocateDetail = { fraction?: number; cfi?: string; tocItem?: { href?: string } };
type FoliateView = HTMLElement & { open: (file: File) => Promise<void>; init: (options: { lastLocation?: string; showTextStart: boolean }) => Promise<void>; prev: () => Promise<void>; next: () => Promise<void>; goTo: (href: string) => Promise<void>; goToFraction: (fraction: number) => Promise<void>; book?: { toc?: TocItem[]; metadata?: { title?: unknown } }; renderer?: { setStyles?: (css: string) => void }; close: () => void };
function readerCss(fontScale: number, lineHeight: number, paragraphSpacing: number, justify: boolean, theme: "light" | "dark") {
  const root = getComputedStyle(document.documentElement);
  const background = root.getPropertyValue("--color-background-body").trim();
  const foreground = root.getPropertyValue("--color-text-primary").trim();
  const accent = root.getPropertyValue("--color-accent").trim();
  /*
   * Calibre and other toolships hard-code near-black text (a `.calibre5`
   * class, an inline `color`, or a `body { background: #fff }`), so inheriting
   * `color` from `html` is not enough. In dark mode the content is repainted
   * over the top; `!important` also beats the book's inline styles. Links keep
   * the accent colour.
   */
  const darkOverride = theme === "dark" ? `
  html, body { background-color: ${background} !important; color: ${foreground} !important; }
  body * { color: ${foreground} !important; background-color: transparent !important; }
  a, a * { color: ${accent} !important; }
` : "";
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
  img, svg { max-width: 100%; height: auto; }${darkOverride}`;
}
function flattenToc(items: TocItem[], depth = 0): FlatTocItem[] {
  return items.flatMap((item) => [{ ...item, depth }, ...flattenToc(item.subitems ?? [], depth + 1)]);
}

const FONT_MIN = 0.8;
const FONT_MAX = 1.5;

function ReaderPage() {
  const { bookId } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const book = useLibrary((state) => state.books.find((item) => item.id === bookId));
  const isReady = useLibrary((state) => state.isReady);
  const updateProgress = useLibrary((state) => state.updateProgress);
  const settings = useReaderSettings();
  const { theme } = useThemeMode();
  const hostRef = useRef<HTMLElement>(null);
  const textHostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeHref, setActiveHref] = useState<string>();
  const [progress, setProgress] = useState(book?.progress ?? 0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [isChromeVisible, setIsChromeVisible] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isFontOpen, setIsFontOpen] = useState(false);
  const [fontPreview, setFontPreview] = useState(settings.fontScale);
  const flatToc = flattenToc(toc);

  function goBack() {
    if (router.history.canGoBack()) {
      router.history.back();
      return;
    }
    void navigate({ to: "/book/$bookId", params: { bookId } });
  }

  function seekTo(percent: number) {
    setIsScrubbing(false);
    void viewRef.current?.goToFraction(percent / 100);
  }

  function commitFont(value: number) {
    const next = Math.min(FONT_MAX, Math.max(FONT_MIN, Number(value.toFixed(1))));
    setFontPreview(next);
    settings.update({ fontScale: next });
  }

  // TXT pages by scrolling; the centre still toggles the chrome.
  function handleTextTap(event: React.MouseEvent<HTMLDivElement>) {
    if (window.getSelection()?.toString()) return;
    const scroller = textHostRef.current?.querySelector<HTMLElement>(".text-reader");
    if (!scroller) return;
    const width = event.currentTarget.clientWidth;
    if (event.clientX < width * 0.3) scroller.scrollBy({ top: -scroller.clientHeight * 0.9, behavior: "smooth" });
    else if (event.clientX > width * 0.7) scroller.scrollBy({ top: scroller.clientHeight * 0.9, behavior: "smooth" });
    else setIsChromeVisible((visible) => !visible);
  }

  // Keep the custom size slider in step with the stored setting.
  useEffect(() => { setFontPreview(settings.fontScale); }, [settings.fontScale]);

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
        view.addEventListener("relocate", ((event: CustomEvent<RelocateDetail>) => {
          const nextProgress = Math.round((event.detail.fraction ?? 0) * 100);
          setProgress(nextProgress);
          setActiveHref(event.detail.tocItem?.href);
          window.clearTimeout(saveTimer);
          saveTimer = window.setTimeout(() => updateProgress(selectedBook.id, nextProgress, event.detail.cfi), 800);
        }) as EventListener);
        // Tap zones: left/right turn the page, the middle toggles the chrome.
        view.addEventListener("load", ((event: CustomEvent<{ doc?: Document }>) => {
          const doc = event.detail?.doc;
          if (!doc) return;
          doc.addEventListener("click", (click: MouseEvent) => {
            const target = click.target as Element | null;
            if (target?.closest?.("a[href]")) return;
            const selection = doc.getSelection();
            if (selection && !selection.isCollapsed) return;
            /*
             * foliate lays the whole chapter out in one wide iframe and scrolls
             * it inside a closed shadow root, so `clientX` alone is not the
             * position on screen. offsetting by the iframe's own rect against
             * the visible host cancels that scroll out.
             */
            const frameEl = doc.defaultView?.frameElement as HTMLElement | null;
            const host = doc.defaultView?.parent?.document.querySelector(".foliate-host");
            if (!frameEl || !host) return;
            const hostRect = host.getBoundingClientRect();
            const x = click.clientX + frameEl.getBoundingClientRect().left - hostRect.left;
            if (x < hostRect.width * 0.3) void view.prev();
            else if (x > hostRect.width * 0.7) void view.next();
            else setIsChromeVisible((visible) => !visible);
          });
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
  }, [bookId, book?.format, isReady, navigate, updateProgress]);

  // Typography and theme changes repaginate the open book without reopening it.
  useEffect(() => {
    viewRef.current?.renderer?.setStyles?.(readerCss(settings.fontScale, settings.lineHeight, settings.paragraphSpacing, settings.justify, theme));
  }, [theme, settings.fontScale, settings.lineHeight, settings.paragraphSpacing, settings.justify]);

  // Desktop keyboards: the arrow keys turn the page like tapping the edges.
  useEffect(() => {
    if (book?.format !== "EPUB") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (event.key === "ArrowRight") { event.preventDefault(); void viewRef.current?.next(); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); void viewRef.current?.prev(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [book?.format]);

  if (!book) return <VStack className="reader-page" align="center" justify="center" gap={2}><Heading level={4}>正在打开书籍</Heading></VStack>;
  const textReader = book.format === "TXT";
  return <MotionConfig reducedMotion="user"><VStack className="reader-page" gap={0}>
    {textReader
      ? <div ref={textHostRef} className="text-reader-host" onClick={handleTextTap}><TextReader bookId={book.id} /></div>
      : <section ref={hostRef} className="foliate-host" aria-label="EPUB 阅读区" />}
    <AnimatePresence>
      {isChromeVisible ? <motion.div
        key="reader-chrome-top"
        className="reader-chrome-layer reader-chrome-layer-top"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -16, opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <SecondaryAppBar className="reader-chrome reader-chrome-top" title={book.title} onBack={goBack}>
          {textReader ? null : <Button label="Aa" variant="ghost" size="lg" onClick={() => setIsFontOpen(true)} />}
        </SecondaryAppBar>
      </motion.div> : null}
    </AnimatePresence>
    <AnimatePresence>
      {isChromeVisible && !textReader ? <motion.div
        key="reader-chrome-bottom"
        className="reader-chrome-layer reader-chrome-layer-bottom"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <HStack as="footer" className="reader-chrome reader-chrome-bottom" align="center" gap={3}>
          <IconButton label="目录" variant="ghost" icon={<Icon icon={List} />} onClick={() => setIsTocOpen(true)} />
          <input
            className="reader-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            aria-label="阅读进度"
            value={Math.round(isScrubbing ? scrubValue : progress)}
            onChange={(event) => { setIsScrubbing(true); setScrubValue(Number(event.target.value)); }}
            onPointerUp={(event) => seekTo(Number(event.currentTarget.value))}
            onKeyUp={(event) => seekTo(Number(event.currentTarget.value))}
            onBlur={() => setIsScrubbing(false)}
          />
          <Text type="supporting" color="secondary">{Math.round(progress)}%</Text>
        </HStack>
      </motion.div> : null}
    </AnimatePresence>
    <AnimatePresence>
      {isTocOpen ? <motion.div
        key="reader-toc"
        className="reader-toc-layer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <div className="reader-toc-scrim" onClick={() => setIsTocOpen(false)} aria-hidden="true" />
        <motion.section
          className="reader-toc"
          aria-label="目录"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <HStack className="reader-toc-header" align="center" justify="between" gap={2}>
            <Heading level={5}>目录</Heading>
            <IconButton label="关闭目录" variant="ghost" icon={<Icon icon={X} />} onClick={() => setIsTocOpen(false)} />
          </HStack>
          <div className="reader-toc-list">
            {flatToc.map((item) => <button
              key={`${item.depth}-${item.href}-${item.label}`}
              type="button"
              className="reader-toc-item"
              data-active={activeHref === item.href}
              style={{ paddingInlineStart: `calc(var(--spacing-4) + ${item.depth} * var(--spacing-3))` }}
              onClick={() => { void viewRef.current?.goTo(item.href); setIsTocOpen(false); }}
            >{item.label}</button>)}
            {!flatToc.length ? <Text className="reader-toc-empty" type="body" color="secondary">这本书没有目录。</Text> : null}
          </div>
        </motion.section>
      </motion.div> : null}
    </AnimatePresence>
    <AnimatePresence>
      {isFontOpen ? <motion.section
        key="reader-font"
        className="reader-font-panel"
        aria-label="字号"
        initial={{ opacity: 0, scale: 0.94, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -6 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        style={{ transformOrigin: "top right" }}
      >
        <HStack align="center" justify="between" gap={2}>
          <Heading level={5}>字号</Heading>
          <IconButton label="关闭字号" variant="ghost" icon={<Icon icon={X} />} onClick={() => setIsFontOpen(false)} />
        </HStack>
        <HStack className="reader-font-row" align="center" gap={2}>
          <button type="button" className="reader-font-step" aria-label="减小字号" onClick={() => commitFont(settings.fontScale - 0.1)}>A−</button>
          <input
            className="reader-font-slider"
            type="range"
            min={FONT_MIN}
            max={FONT_MAX}
            step={0.1}
            aria-label="字号大小"
            value={fontPreview}
            onChange={(event) => setFontPreview(Number(event.target.value))}
            onPointerUp={(event) => commitFont(Number(event.currentTarget.value))}
            onKeyUp={(event) => commitFont(Number(event.currentTarget.value))}
          />
          <button type="button" className="reader-font-step" aria-label="增大字号" onClick={() => commitFont(settings.fontScale + 0.1)}>A+</button>
        </HStack>
        <HStack align="center" justify="between" gap={2}>
          <Text type="supporting" color="secondary">{Math.round(fontPreview * 100)}%</Text>
          <button type="button" className="reader-font-toggle" data-on={settings.justify} onClick={() => settings.update({ justify: !settings.justify })}>
            两端对齐 · {settings.justify ? "开" : "关"}
          </button>
        </HStack>
      </motion.section> : null}
    </AnimatePresence>
    {status === "loading" ? <VStack className="reader-state" align="center" justify="center" gap={2}><Heading level={4}>正在排版</Heading><Text type="body" color="secondary">首次打开会根据当前字体生成分页。</Text></VStack> : null}
    {status === "error" ? <VStack className="reader-state" align="center" justify="center" gap={3}><Heading level={4}>无法打开 EPUB</Heading><Text type="body" color="secondary">{error}</Text><Button label="返回详情" onClick={() => void navigate({ to: "/book/$bookId", params: { bookId } })} /></VStack> : null}
  </VStack></MotionConfig>;
}

function TextReader({ bookId }: { bookId: string }) {
  const [text, setText] = useState("");
  useEffect(() => { void getBookFile(bookId).then((file) => file?.file.text().then(setText)); }, [bookId]);
  return <section className="text-reader" aria-label="TXT 正文">{text.split(/\r?\n/).filter(Boolean).map((paragraph, index) => <Text key={index} className="text-reader-paragraph" type="body" display="block">{paragraph}</Text>)}</section>;
}
