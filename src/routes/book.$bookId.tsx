import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { Bookmark, BookmarkCheck, BookOpen, Play } from "lucide-react";
import { useLibrary } from "../services/library";

export const Route = createFileRoute("/book/$bookId")({ component: BookPage });

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function BookPage() {
  const { bookId } = Route.useParams();
  const navigate = useNavigate();
  const book = useLibrary((state) => state.books.find((item) => item.id === bookId));
  const isReady = useLibrary((state) => state.isReady);
  const toggleFavorite = useLibrary((state) => state.toggleFavorite);
  const toast = useToast();
  const [coverUrl, setCoverUrl] = useState<string>();
  useEffect(() => { if (isReady && !book) void navigate({ to: "/" }); }, [book, isReady, navigate]);
  useEffect(() => { if (!book?.cover) return; const url = URL.createObjectURL(book.cover); setCoverUrl(url); return () => URL.revokeObjectURL(url); }, [book?.cover]);
  if (!book) return <VStack className="book-page" align="center" justify="center" gap={2}><Heading level={4}>正在打开书籍</Heading></VStack>;
  const isStarted = book.progress > 0;
  return <VStack className="book-page mt-6" gap={5}>
    <VStack className="book-hero" align="center" gap={4}><section className="book-detail-cover" aria-label={`${book.title} 封面`}>{coverUrl ? <img src={coverUrl} alt="" /> : <VStack className="cover-fallback" align="center" justify="between" gap={2}><Text type="supporting" color="inherit">{book.format}</Text><Heading level={2} color="inherit">{book.title.slice(0, 1)}</Heading><Text type="supporting" color="inherit">阅流</Text></VStack>}</section><VStack align="center" gap={1}><Heading level={2}>{book.title}</Heading><Text type="body" color="secondary">{book.author}</Text></VStack></VStack>
    <HStack className="book-stat-row" align="center" justify="around" gap={3}><VStack align="center" gap={0}><Text type="supporting" color="secondary">格式</Text><Text type="body">{book.format}</Text></VStack><VStack align="center" gap={0}><Text type="supporting" color="secondary">进度</Text><Text type="body">{Math.round(book.progress)}%</Text></VStack><VStack align="center" gap={0}><Text type="supporting" color="secondary">大小</Text><Text type="body">{formatSize(book.size)}</Text></VStack></HStack>
    <HStack align="center" gap={2}>
      <StackItem size="fill">
        <Button label={isStarted ? "继续阅读" : "开始阅读"} size="lg" width="100%" variant="primary" icon={<Icon icon={isStarted ? BookOpen : Play} />} onClick={() => void navigate({ to: "/reader/$bookId", params: { bookId } })} />
      </StackItem>
      <IconButton
        label={book.isFavorite ? "取消收藏" : "收藏"}
        variant={book.isFavorite ? "primary" : "secondary"}
        size="lg"
        icon={<Icon icon={book.isFavorite ? BookmarkCheck : Bookmark} />}
        onClick={() => {
          toggleFavorite(book.id);
          toast({
            body: book.isFavorite ? "已取消收藏" : "已收藏",
            isAutoHide: true,
            autoHideDuration: 3000,
            uniqueID: `favorite-${book.id}`,
          });
        }}
      />
    </HStack>
    <VStack gap={2}><Heading level={4}>阅读说明</Heading><Text type="body" color="secondary">阅读位置会自动保存。本书在本机离线阅读，导入文件不会上传到网络。</Text></VStack>
  </VStack>;
}
