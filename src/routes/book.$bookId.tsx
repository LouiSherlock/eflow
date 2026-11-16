import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { ArrowLeft, BookOpen, Play, Trash2 } from "lucide-react";
import { useLibrary } from "../services/library";

export const Route = createFileRoute("/book/$bookId")({ component: BookPage });

function BookPage() {
  const { bookId } = Route.useParams();
  const navigate = useNavigate();
  const book = useLibrary((state) => state.books.find((item) => item.id === bookId));
  const isReady = useLibrary((state) => state.isReady);
  const removeBook = useLibrary((state) => state.removeBook);
  const [coverUrl, setCoverUrl] = useState<string>();
  useEffect(() => { if (isReady && !book) void navigate({ to: "/" }); }, [book, isReady, navigate]);
  useEffect(() => { if (!book?.cover) return; const url = URL.createObjectURL(book.cover); setCoverUrl(url); return () => URL.revokeObjectURL(url); }, [book?.cover]);
  if (!book) return <VStack className="book-page" align="center" justify="center" gap={2}><Heading level={4}>正在打开书籍</Heading></VStack>;
  const isStarted = book.progress > 0;
  return <VStack className="book-page" gap={5}>
    <HStack className="book-page-topbar" justify="between"><IconButton label="返回书架" variant="ghost" icon={<Icon icon={ArrowLeft} />} onClick={() => void navigate({ to: "/" })} /><IconButton label="从书架移除" variant="ghost" icon={<Icon icon={Trash2} />} onClick={() => { if (window.confirm(`从书架移除《${book.title}》？`)) { void removeBook(book.id); void navigate({ to: "/" }); } }} /></HStack>
    <VStack className="book-hero" align="center" gap={4}><section className="book-detail-cover" aria-label={`${book.title} 封面`}>{coverUrl ? <img src={coverUrl} alt="" /> : <VStack className="cover-fallback" align="center" justify="between" gap={2}><Text type="supporting">{book.format}</Text><Heading level={2}>{book.title.slice(0, 1)}</Heading><Text type="supporting">纸间</Text></VStack>}</section><VStack align="center" gap={1}><Heading level={2}>{book.title}</Heading><Text type="body" color="secondary">{book.author}</Text></VStack></VStack>
    <HStack className="book-stat-row" align="center" justify="around" gap={3}><VStack align="center" gap={0}><Text type="supporting" color="secondary">格式</Text><Text type="body">{book.format}</Text></VStack><VStack align="center" gap={0}><Text type="supporting" color="secondary">进度</Text><Text type="body">{Math.round(book.progress)}%</Text></VStack><VStack align="center" gap={0}><Text type="supporting" color="secondary">大小</Text><Text type="body">{Math.max(1, Math.round(book.size / 1024 / 1024))} MB</Text></VStack></HStack>
    <Button label={isStarted ? "继续阅读" : "开始阅读"} size="lg" width="100%" variant="primary" icon={<Icon icon={isStarted ? BookOpen : Play} />} onClick={() => void navigate({ to: "/reader/$bookId", params: { bookId } })} />
    <VStack gap={2}><Heading level={4}>阅读说明</Heading><Text type="body" color="secondary">阅读位置会自动保存。本书在本机离线阅读，导入文件不会上传到网络。</Text></VStack>
  </VStack>;
}
