import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@astryxdesign/core/Card";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { Bookmark, BookmarkMinus, MoreHorizontal, Trash2 } from "lucide-react";
import type { Book } from "../services/library";

export function BookCover({ book, variant = "grid" }: { book: Book; variant?: "grid" | "hero" }) {
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

/** One shelf card. Title and author stay on single lines so a grid row lines up. */
export function BookCard({ book, onToggleFavorite, onRequestRemove }: {
  book: Book;
  onToggleFavorite: (book: Book) => void;
  onRequestRemove: (book: Book) => void;
}) {
  const toast = useToast();
  return <Card className="book-card" padding={2}>
    <VStack gap={2}>
      <Link to="/book/$bookId" params={{ bookId: book.id }} className="book-cover-link"><BookCover book={book} /></Link>
      <HStack align="start" justify="between" gap={1}>
        <VStack className="book-meta" gap={1}>
          <Heading level={5} maxLines={1}>{book.title}</Heading>
        </VStack>
        <DropdownMenu
          presentation="adaptive"
          hasChevron={false}
          renderTrigger={(props) => (
            <IconButton
              {...props}
              label={`《${book.title}》更多操作`}
              variant="ghost"
              size="sm"
              icon={<Icon icon={MoreHorizontal} />}
            />
          )}
          items={[
            {
              label: book.isFavorite ? "取消收藏" : "收藏",
              icon: book.isFavorite ? BookmarkMinus : Bookmark,
              onClick: () => {
                onToggleFavorite(book);
                toast({
                  body: book.isFavorite ? "已取消收藏" : "已收藏",
                  isAutoHide: true,
                  autoHideDuration: 3000,
                  uniqueID: `favorite-${book.id}`,
                });
              },
            },
            { type: "divider" },
            {
              label: "删除",
              icon: Trash2,
              variant: "destructive",
              onClick: () => onRequestRemove(book),
            },
          ]}
        />
      </HStack>
      {book.progress > 0 ? <progress className="book-progress" value={book.progress} max="100" /> : <Text type="supporting" color="secondary">尚未阅读</Text>}
    </VStack>
  </Card>;
}
