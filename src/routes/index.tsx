import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useAnnounce } from "@astryxdesign/core/hooks";
import { BookOpen, FilePlus2, Search } from "lucide-react";
import { BookCard, BookCover } from "../components/book-card";
import { RemoveBookDialog } from "../components/remove-book-dialog";
import { type Book, useLibrary } from "../services/library";

export const Route = createFileRoute("/")({ component: LibraryPage });

function LibraryPage() {
  const { books, isReady, hydrate, importBook, toggleFavorite, removeBook } = useLibrary();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ status: "success" | "error"; message: string }>();
  const announce = useAnnounce();
  const [isImporting, setIsImporting] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<Book>();
  useEffect(() => { void hydrate(); }, [hydrate]);
  const recent = books.filter((book) => book.progress > 0).sort((a, b) => b.updatedAt - a.updatedAt)[0];

  async function handleImport(files: FileList | null) {
    if (!files?.length) return;
    setFeedback(undefined); setIsImporting(true);
    try {
      for (const file of Array.from(files)) await importBook(file);
      const message = `已导入 ${files.length} 本书，可以开始阅读。`;
      setFeedback({ status: "success", message });
      announce(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "导入失败，请确认文件未损坏后重试。";
      setFeedback({ status: "error", message });
      announce(message, "assertive");
    }
    finally { setIsImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return <VStack className="library-page" gap={5}>
    <HStack className="library-welcome" align="end" justify="between" gap={3}>
      <VStack gap={1}> <Heading level={1}>我的书架</Heading></VStack>
      <HStack align="center" gap={2}>
        <IconButton label="搜索书架" variant="ghost" size="lg" icon={<Icon icon={Search} />} onClick={() => void navigate({ to: "/search" })} />
        <Button label="导入" variant="primary" size="lg" isLoading={isImporting} icon={<Icon icon={FilePlus2} />} onClick={() => fileRef.current?.click()} />
      </HStack>
      <input ref={fileRef} className="book-file-input" type="file" accept=".epub,.txt" multiple onChange={(event) => void handleImport(event.target.files)} />
    </HStack>
    {feedback ? <Banner status={feedback.status} title={feedback.message} isDismissable onDismiss={() => setFeedback(undefined)} /> : null}
    {recent ? <Link to="/reader/$bookId" params={{ bookId: recent.id }} className="continue-reading"><Card className="continue-card" padding={4}><HStack align="center" gap={4}><BookCover book={recent} variant="hero" /><VStack className="continue-copy" gap={2}><Text type="supporting" color="secondary">继续阅读</Text><Heading level={3}>{recent.title}</Heading><Text type="body" color="secondary">{recent.author}</Text><progress className="book-progress" value={recent.progress} max="100" /><Text type="supporting" color="secondary">已读 {Math.round(recent.progress)}%</Text></VStack></HStack></Card></Link> : null}
    <VStack gap={1}><Heading level={3}>全部书籍</Heading><Text type="supporting" color="secondary">{isReady ? `${books.length} 本` : "正在载入书架"}</Text></VStack>
    {books.length ? <section className="book-grid" aria-label="书籍列表">{books.map((book) => <BookCard key={book.id} book={book} onToggleFavorite={() => toggleFavorite(book.id)} onRequestRemove={setPendingRemoval} />)}</section> : <Card className="empty-library" padding={5}><VStack align="center" gap={3}><Icon className="empty-icon" icon={BookOpen} /><Heading level={3}>书架准备好了</Heading><Text type="body" color="secondary">导入 EPUB 或 TXT，阅读进度会保存在本机。</Text><Button label="选择书籍" variant="primary" icon={<Icon icon={FilePlus2} />} onClick={() => fileRef.current?.click()} /></VStack></Card>}
    <RemoveBookDialog
      book={pendingRemoval}
      onCancel={() => setPendingRemoval(undefined)}
      onConfirm={(book) => {
        void removeBook(book.id);
        setPendingRemoval(undefined);
      }}
    />
  </VStack>;
}
