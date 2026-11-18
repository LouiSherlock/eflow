import "foliate-js/view.js";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Slider } from "@astryxdesign/core/Slider";
import { VStack } from "@astryxdesign/core/VStack";
import { ChevronRight, CircleAlert, List, Sun, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { SecondaryAppBar } from "../../../components/secondary-app-bar";
import { useKeepScreenOn } from "../../../hooks/use-keep-screen-on";
import { useThemeMode } from "../../../providers/theme-provider";
import { applyEyeCare, clearEyeCare } from "../../../services/eye-care";
import { bookFileMeta, getBookFile, useLibrary } from "../../../services/library";
import { useReaderSettings } from "../../../services/reader-settings";
import { hasNativeSystemBars } from "../../../services/system-bars";

export const Route = createFileRoute("/reader/$bookId")({ component: ReaderPage });

type TocItem = { label: string; href: string; subitems?: TocItem[] };
type RelocateDetail = { fraction?: number; cfi?: string; tocItem?: { href?: string } };
type FoliateView = HTMLElement & { open: (file: File) => Promise<void>; init: (options: { lastLocation?: string; showTextStart: boolean }) => Promise<void>; prev: () => Promise<void>; next: () => Promise<void>; goTo: (href: string) => Promise<void>; goToFraction: (fraction: number) => Promise<void>; book?: { toc?: TocItem[]; metadata?: { title?: unknown } }; renderer?: { setStyles?: (css: string) => void }; close: () => void };
/**
 * Id painted on the book's own `<html>` so our theme rules outrank its CSS.
 * Calibre exports style text with class selectors and `!important`
 * (`div.sgc-toc-level-1 a { color: black !important }`), which beats any
 * element-only selector, so `#id` specificity is what makes the theme win.
 */
const BOOK_ROOT_ID = "eflow-reader-root";
function readerCss(fontScale: number, lineHeight: number, paragraphSpacing: number, justify: boolean, theme: "light" | "dark") {
  const root = getComputedStyle(document.documentElement);
  const background = root.getPropertyValue("--color-background-body").trim();
  const foreground = root.getPropertyValue("--color-text-primary").trim();
  const accent = root.getPropertyValue("--color-accent").trim();
  /*
   * Books hard-code near-black text (a `.calibre5` class, an inline `color`,
   * or a `body { background: #fff }`). The `#BOOK_ROOT_ID` prefix outranks
   * their class selectors and `!important` declarations; inline styles lose to
   * author `!important` too, so the app theme always shows through.
   */
  const darkOverride = theme === "dark" ? `
  #${BOOK_ROOT_ID}, #${BOOK_ROOT_ID} body { background-color: ${background} !important; color: ${foreground} !important; }
  #${BOOK_ROOT_ID} body * { color: inherit !important; background-color: transparent !important; }
  #${BOOK_ROOT_ID} body a, #${BOOK_ROOT_ID} body a * { color: ${accent} !important; }
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
function tocKey(item: TocItem, depth: number) { return `${depth}-${item.href}-${item.label}`; }

/**
 * Recursive chapter list. Nested entries are only mounted while their parent
 * is expanded — collapsed branches are absent from the DOM, not hidden.
 */
function TocBranch({ items, depth, activeHref, expanded, onToggle, onNavigate }: {
  items: TocItem[];
  depth: number;
  activeHref?: string;
  expanded: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onNavigate: (href: string) => void;
}) {
  return <>{items.map((item) => {
    const key = tocKey(item, depth);
    const children = item.subitems ?? [];
    const isOpen = expanded.has(key);
    return <div key={key}>
      <div className="reader-toc-row" style={{ paddingInlineStart: `calc(var(--spacing-4) + ${depth} * var(--spacing-3))` }}>
        <button
          type="button"
          className="reader-toc-item"
          data-active={activeHref === item.href}
          onClick={() => onNavigate(item.href)}
        >{item.label}</button>
        {children.length ? <button
          type="button"
          className="reader-toc-toggle"
          data-open={isOpen}
          aria-expanded={isOpen}
          aria-label={isOpen ? `收起 ${item.label}` : `展开 ${item.label}`}
          onClick={() => onToggle(key)}
        ><Icon icon={ChevronRight} size="xsm" /></button> : null}
      </div>
      {children.length && isOpen ? <TocBranch
        items={children}
        depth={depth + 1}
        activeHref={activeHref}
        expanded={expanded}
        onToggle={onToggle}
        onNavigate={onNavigate}
      /> : null}
    </div>;
  })}</>;
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
  const [expandedToc, setExpandedToc] = useState<ReadonlySet<string>>(() => new Set());
  const [isFontOpen, setIsFontOpen] = useState(false);
  const [isEyeCareOpen, setIsEyeCareOpen] = useState(false);
  const [fontPreview, setFontPreview] = useState(settings.fontScale);
  const [chromeActivity, setChromeActivity] = useState(0);

  useKeepScreenOn(Boolean(book));

  useEffect(() => {
    void applyEyeCare(settings);
  }, [settings.followSystem, settings.level, settings.warm]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void applyEyeCare(useReaderSettings.getState());
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      void clearEyeCare();
    };
  }, []);

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

  function toggleTocBranch(key: string) {
    setExpandedToc((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

  // Hide the chrome again after five seconds without any interaction.
  useEffect(() => {
    if (!isChromeVisible || isTocOpen || isFontOpen || isEyeCareOpen) return;
    const timeout = window.setTimeout(() => setIsChromeVisible(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [isChromeVisible, isTocOpen, isFontOpen, isEyeCareOpen, chromeActivity]);

  useEffect(() => {
    if (!isChromeVisible) return;
    const bump = () => setChromeActivity((count) => count + 1);
    window.addEventListener("pointerdown", bump, true);
    window.addEventListener("pointerup", bump, true);
    window.addEventListener("keydown", bump, true);
    return () => {
      window.removeEventListener("pointerdown", bump, true);
      window.removeEventListener("pointerup", bump, true);
      window.removeEventListener("keydown", bump, true);
    };
  }, [isChromeVisible]);

  useEffect(() => {
    const selectedBook = useLibrary.getState().books.find((item) => item.id === bookId);
    if (!selectedBook) { if (isReady) void navigate({ to: "/" }); return; }
    if (selectedBook.format === "TXT") { setStatus("ready"); return; }
    let cancelled = false;
    let saveTimer: number | undefined;
    let view: FoliateView | null = null;
    const closeView = (target: FoliateView) => {
      target.close();
      // foliate-js may still finish open() after this effect was cleaned up.
      // Clear the old renderer reference so a later cleanup can destroy a
      // renderer that was created after this one.
      target.renderer = undefined;
      target.remove();
      if (viewRef.current === target) viewRef.current = null;
    };
    const open = async () => {
      try {
        const stored = await getBookFile(selectedBook.id);
        if (cancelled) return;
        if (!stored || cancelled) throw new Error("找不到本地书籍文件，请重新导入。");
        const file = new File([stored.file], `${selectedBook.title}.${bookFileMeta(selectedBook.format).ext}`, { type: bookFileMeta(selectedBook.format).type });
        view = document.createElement("foliate-view") as FoliateView;
        const currentView = view;
        view.addEventListener("relocate", ((event: CustomEvent<RelocateDetail>) => {
          if (cancelled) return;
          const nextProgress = Math.round((event.detail.fraction ?? 0) * 100);
          setProgress(nextProgress);
          setActiveHref(event.detail.tocItem?.href);
          window.clearTimeout(saveTimer);
          saveTimer = window.setTimeout(() => updateProgress(selectedBook.id, nextProgress, event.detail.cfi), 800);
        }) as EventListener);
        // Middle taps toggle the chrome; the edge zones are plain buttons over
        // the book, so paging does not depend on iframe coordinates.
        view.addEventListener("load", ((event: CustomEvent<{ doc?: Document }>) => {
          if (cancelled) return;
          const doc = event.detail?.doc;
          if (!doc) return;
          // Each loaded section is its own document; tag it so `readerCss`
          // (applied by foliate to this doc) can outrank the book's CSS.
          doc.documentElement.id = BOOK_ROOT_ID;
          // Inline colours — including inline `!important`, which outranks any
          // stylesheet — are dropped so the theme still wins; layout is kept.
          doc.querySelectorAll<HTMLElement>("[style]").forEach((element) => {
            element.style.removeProperty("color");
            element.style.removeProperty("background-color");
          });
          const isTapTarget = (target: EventTarget | null) => {
            const el = target as Element | null;
            if (el?.closest?.("a[href]")) return false;
            const selection = doc.getSelection();
            return !(selection && !selection.isCollapsed);
          };
          let lastTap = 0;
          const toggleChrome = () => {
            lastTap = Date.now();
            setIsChromeVisible((visible) => !visible);
          };
          doc.addEventListener("click", (click: MouseEvent) => {
            if (Date.now() - lastTap < 700) return; // the click a touch already handled
            if (!isTapTarget(click.target)) return;
            toggleChrome();
          });
          // A touch that moves slightly prevents the click, so handle taps
          // from the touch stream as well.
          let startX = 0, startY = 0, startTime = 0;
          doc.addEventListener("touchstart", (touch: TouchEvent) => {
            const point = touch.changedTouches[0];
            if (!point) return;
            startX = point.clientX; startY = point.clientY; startTime = Date.now();
          }, { passive: true });
          doc.addEventListener("touchend", (touch: TouchEvent) => {
            const point = touch.changedTouches[0];
            if (!point) return;
            const moved = Math.hypot(point.clientX - startX, point.clientY - startY);
            if (moved > 12 || Date.now() - startTime > 700) return;
            if (!isTapTarget(touch.target)) return;
            toggleChrome();
          });
        }) as EventListener);
        hostRef.current?.append(view);
        viewRef.current = view;
        await view.open(file);
        if (cancelled) { closeView(currentView); return; }
        currentView.renderer?.setStyles?.(readerCss(settings.fontScale, settings.lineHeight, settings.paragraphSpacing, settings.justify, themeRef.current));
        await currentView.init({ lastLocation: selectedBook.cfi, showTextStart: true });
        if (!cancelled) { setToc(currentView.book?.toc ?? []); setStatus("ready"); }
        else closeView(currentView);
      } catch (reason) {
        if (view) closeView(view);
        if (!cancelled) { setError(reason instanceof Error ? reason.message : "无法打开这本书。"); setStatus("error"); }
      }
    };
    void open();
    return () => {
      cancelled = true;
      window.clearTimeout(saveTimer);
      if (view) closeView(view);
    };
  }, [bookId, book?.format, isReady, navigate, updateProgress]);

  // Typography and theme changes repaginate the open book without reopening it.
  useEffect(() => {
    viewRef.current?.renderer?.setStyles?.(readerCss(settings.fontScale, settings.lineHeight, settings.paragraphSpacing, settings.justify, theme));
  }, [theme, settings.fontScale, settings.lineHeight, settings.paragraphSpacing, settings.justify]);

  // Desktop keyboards: the arrow keys turn the page like tapping the edges.
  useEffect(() => {
    if (!book || book.format === "TXT") return;
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
      ? <div ref={textHostRef} className="text-reader-host" onClick={handleTextTap}>
        <TextReader
          bookId={book.id}
          fontScale={settings.fontScale}
          lineHeight={settings.lineHeight}
          paragraphSpacing={settings.paragraphSpacing}
          justify={settings.justify}
        />
      </div>
      : <>
        <section ref={hostRef} className="foliate-host" aria-label="电子书阅读区" />
        <button type="button" tabIndex={-1} aria-label="上一页" className="reader-tap-zone reader-tap-zone-left" onClick={() => void viewRef.current?.prev()} />
        <button type="button" tabIndex={-1} aria-label="下一页" className="reader-tap-zone reader-tap-zone-right" onClick={() => void viewRef.current?.next()} />
      </>}
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
          <Button label="Aa" variant="ghost" size="lg" onClick={() => setIsFontOpen(true)} />
          <IconButton
            label="阅读亮度与色温"
            variant="ghost"
            icon={<Icon icon={Sun} />}
            onClick={() => setIsEyeCareOpen(true)}
          />
        </SecondaryAppBar>
      </motion.div> : null}
    </AnimatePresence>
    <AnimatePresence>
      {isEyeCareOpen ? <motion.section
        key="reader-eye-care"
        className="reader-eye-care-panel"
        aria-label="阅读亮度与色温"
        initial={{ opacity: 0, scale: 0.94, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -6 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        style={{ transformOrigin: "top right" }}
      >
        <HStack align="center" justify="between" gap={2}>
          <Heading level={5}>阅读舒适度</Heading>
          <HStack align="center" gap={1}>
            <Button
              label="重置"
              size="sm"
              variant="ghost"
              onClick={() => settings.update({ level: 1, followSystem: true, warm: 0 })}
            />
            <IconButton label="关闭阅读舒适度" variant="ghost" icon={<Icon icon={X} />} onClick={() => setIsEyeCareOpen(false)} />
          </HStack>
        </HStack>
        <Text type="supporting" color="secondary">
          {hasNativeSystemBars() ? "亮度应用于当前应用窗口。" : "桌面端通过页面调暗，系统亮度请在系统设置中调整。"}
        </Text>
        <Slider
          label="阅读亮度"
          min={0}
          max={100}
          step={1}
          value={Math.round(settings.level * 100)}
          valueDisplay="text"
          formatValue={(value) => `${Math.round(value)}%`}
          onChange={(value: number | [number, number]) => {
            if (typeof value === "number") {
              settings.update({ level: value / 100, followSystem: false });
            }
          }}
        />
        <Button
          label={settings.followSystem ? "跟随系统亮度 · 已开启" : "跟随系统亮度 · 已关闭"}
          size="sm"
          variant="secondary"
          onClick={() => settings.update({ followSystem: !settings.followSystem })}
        />
        <Slider
          label="暖色强度"
          min={0}
          max={100}
          step={1}
          value={Math.round(settings.warm * 100)}
          valueDisplay="text"
          formatValue={(value) => `${Math.round(value)}%`}
          onChange={(value: number | [number, number]) => {
            if (typeof value === "number") settings.update({ warm: value / 100 });
          }}
        />
      </motion.section> : null}
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
          <Slider
            containerClassName="reader-slider"
            label="阅读进度"
            isLabelHidden
            min={0}
            max={100}
            step={1}
            value={Math.round(isScrubbing ? scrubValue : progress)}
            valueDisplay="none"
            onChange={(value: number | [number, number]) => {
              if (typeof value === "number") {
                setIsScrubbing(true);
                setScrubValue(value);
              }
            }}
            onChangeEnd={(value: number | [number, number]) => {
              if (typeof value === "number") seekTo(value);
            }}
          />
          <Text type="supporting" color="secondary">{Math.round(isScrubbing ? scrubValue : progress)}%</Text>
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
            {toc.length ? <TocBranch
              items={toc}
              depth={0}
              activeHref={activeHref}
              expanded={expandedToc}
              onToggle={toggleTocBranch}
              onNavigate={(href) => { void viewRef.current?.goTo(href); setIsTocOpen(false); }}
            /> : <Text className="reader-toc-empty" type="body" color="secondary">这本书没有目录。</Text>}
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
          <Slider
            containerClassName="reader-font-slider"
            label="字号大小"
            isLabelHidden
            min={FONT_MIN}
            max={FONT_MAX}
            step={0.1}
            value={fontPreview}
            valueDisplay="none"
            onChange={(value: number | [number, number]) => {
              if (typeof value === "number") setFontPreview(value);
            }}
            onChangeEnd={(value: number | [number, number]) => {
              if (typeof value === "number") commitFont(value);
            }}
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
    {status === "loading" ? <VStack className="reader-state" align="center" justify="center" gap={2} padding={6}>
      <VStack className="reader-state-card" align="center" gap={3} padding={6}>
        <Spinner size="xl" />
        <VStack align="center" gap={1}>
          <Heading level={4}>正在排版</Heading>
          <Text type="body" color="secondary">首次打开会根据当前字体生成分页。</Text>
        </VStack>
      </VStack>
    </VStack> : null}
    {status === "error" ? <VStack className="reader-state" align="center" justify="center" gap={2} padding={6}>
      <VStack className="reader-state-card" align="center" gap={3} padding={6}>
        <Icon className="reader-state-icon" icon={CircleAlert} />
        <VStack align="center" gap={1}>
          <Heading level={4}>无法打开这本书</Heading>
          <Text type="body" color="secondary">{error}</Text>
        </VStack>
        <Button label="返回详情" onClick={() => void navigate({ to: "/book/$bookId", params: { bookId } })} />
      </VStack>
    </VStack> : null}
  </VStack></MotionConfig>;
}

function TextReader({
  bookId,
  fontScale,
  lineHeight,
  paragraphSpacing,
  justify,
}: {
  bookId: string;
  fontScale: number;
  lineHeight: number;
  paragraphSpacing: number;
  justify: boolean;
}) {
  const [text, setText] = useState("");
  useEffect(() => { void getBookFile(bookId).then((file) => file?.file.text().then(setText)); }, [bookId]);
  const readerStyle = {
    "--reader-font-scale": fontScale,
    "--reader-line-height": lineHeight,
    "--reader-paragraph-spacing": paragraphSpacing,
    "--reader-text-align": justify ? "justify" : "start",
  } as CSSProperties;
  return <section className="text-reader" aria-label="TXT 正文" style={readerStyle}>{text.split(/\r?\n/).filter(Boolean).map((paragraph, index) => <Text key={index} className="text-reader-paragraph" type="body" display="block">{paragraph}</Text>)}</section>;
}
