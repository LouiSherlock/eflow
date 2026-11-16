import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { BookOpen, FilePlus2, MoreHorizontal, X } from "lucide-react";
import { type Book, useLibrary } from "../services/library";

export const Route = createFileRoute("/")({ component: LibraryPage });

function Cover({ book, variant = "grid" }: { book: Book; variant?: "grid" | "hero" }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!book.cover) return;
    const nextUrl = URL.createObjectURL(book.cover);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [book.cover]);
  return <section className={`book-cover book-cover-${variant}`} aria-label={`${book.title} 封面`}>
    {url ? <img src={url} alt="" /> : <VStack className="cover-fallback" align="center" justify="between" gap={2}><Text type="supporting" color="inherit">{book.format}</Text><Heading level={3} color="inherit">{book.title.slice(0, 1)}</Heading><Text type="supporting" color="inherit">纸间</Text></VStack>}
  </section>;
}

function LibraryPage() {
  const { books, isReady, hydrate, importBook, removeBook } = useLibrary();
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<string>();
  const [isImporting, setIsImporting] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Book>();
  useEffect(() => { void hydrate(); }, [hydrate]);
  const visibleBooks = useMemo(() => books.filter((book) => `${book.title} ${book.author}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [books, query]);
  const recent = books.filter((book) => book.progress > 0).sort((a, b) => b.updatedAt - a.updatedAt)[0];

  async function handleImport(files: FileList | null) {
    if (!files?.length) return;
    setFeedback(undefined); setIsImporting(true);
    try { for (const file of Array.from(files)) await importBook(file); setFeedback(`已导入 ${files.length} 本书，可以开始阅读。`); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "导入失败，请确认文件未损坏后重试。"); }
    finally { setIsImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return <VStack className="library-page" gap={5}>
    <HStack className="library-welcome" align="end" justify="between" gap={3}>
      <VStack gap={1}><Text className="library-greeting" type="supporting" color="secondary">今晚，读点喜欢的</Text><Heading level={1}>我的书架</Heading></VStack>
      <Button label="导入" variant="primary" size="lg" isLoading={isImporting} icon={<Icon icon={FilePlus2} />} onClick={() => fileRef.current?.click()} />
      <input ref={fileRef} className="book-file-input" type="file" accept=".epub,.txt" multiple onChange={(event) => void handleImport(event.target.files)} />
    </HStack>
    <VStack className="library-search" gap={0}><TextInput label="搜索书名或作者" value={query} onChange={setQuery} placeholder="搜索书架" /></VStack>
    {feedback ? <HStack className="library-feedback" align="center" justify="between" gap={2}><Text type="supporting">{feedback}</Text><IconButton label="关闭提示" variant="ghost" icon={<Icon icon={X} />} onClick={() => setFeedback(undefined)} /></HStack> : null}
    {recent ? <Link to="/book/$bookId" params={{ bookId: recent.id }} className="continue-reading"><Card className="continue-card" padding={4}><HStack align="center" gap={4}><Cover book={recent} variant="hero" /><VStack className="continue-copy" gap={2}><Text type="supporting" color="secondary">继续阅读</Text><Heading level={3}>{recent.title}</Heading><Text type="body" color="secondary">{recent.author}</Text><progress className="book-progress" value={recent.progress} max="100" /><Text type="supporting" color="secondary">已读 {Math.round(recent.progress)}%</Text></VStack></HStack></Card></Link> : null}
    <HStack align="end" justify="between" gap={3}><VStack gap={1}><Heading level={3}>{query ? "搜索结果" : "全部书籍"}</Heading><Text type="supporting" color="secondary">{isReady ? `${visibleBooks.length} 本` : "正在载入书架"}</Text></VStack>{query ? <Button label="清除" size="sm" variant="ghost" onClick={() => setQuery("")} /> : null}</HStack>
    {visibleBooks.length ? <section className="book-grid" aria-label="书籍列表">{visibleBooks.map((book) => <Card key={book.id} className="book-card" padding={2}><VStack gap={2}><Link to="/book/$bookId" params={{ bookId: book.id }} className="book-cover-link"><Cover book={book} /></Link><HStack align="start" justify="between" gap={1}><VStack className="book-meta" gap={1}><Heading level={5} maxLines={1}>{book.title}</Heading><Text type="supporting" color="secondary" display="block" maxLines={2}>{book.author}</Text></VStack><IconButton label={`删除《${book.title}》`} variant="ghost" size="sm" icon={<Icon icon={MoreHorizontal} />} onClick={() => setPendingRemoval(book)} /></HStack>{book.progress > 0 ? <progress className="book-progress" value={book.progress} max="100" /> : <Text type="supporting" color="secondary">尚未阅读</Text>}</VStack></Card>)}</section> : <Card className="empty-library" padding={5}><VStack align="center" gap={3}><Icon className="empty-icon" icon={BookOpen} /><Heading level={3}>{query ? "没有找到这本书" : "书架准备好了"}</Heading><Text type="body" color="secondary">{query ? "换个书名或作者再试试。" : "导入 EPUB 或 TXT，阅读进度会保存在本机。"}</Text>{!query ? <Button label="选择书籍" variant="primary" icon={<Icon icon={FilePlus2} />} onClick={() => fileRef.current?.click()} /> : null}</VStack></Card>}
    <Text type="supporting" color="secondary">EPUB 由 foliate-js 渲染；文件与封面保存在本机，不会上传。</Text>
    <AlertDialog
      isOpen={Boolean(pendingRemoval)}
      onOpenChange={(isOpen) => { if (!isOpen) setPendingRemoval(undefined); }}
      title="从书架移除？"
      description={pendingRemoval ? `《${pendingRemoval.title}》会从本机书架删除，阅读进度也会一并清除。` : ""}
      cancelLabel="取消"
      actionLabel="移除"
      onAction={() => {
        if (!pendingRemoval) return;
        void removeBook(pendingRemoval.id);
        setPendingRemoval(undefined);
      }}
    />
  </VStack>;
}
