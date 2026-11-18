import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Bookmark } from "lucide-react";
import { useState } from "react";
import { BookGrid } from "../components/book-grid";
import { RemoveBookDialog } from "../components/remove-book-dialog";
import { type Book, useLibrary } from "../services/library";

export const Route = createFileRoute("/favorites")({ component: FavoritesPage });

function FavoritesPage() {
  const books = useLibrary((state) => state.books);
  const toggleFavorite = useLibrary((state) => state.toggleFavorite);
  const removeBook = useLibrary((state) => state.removeBook);
  const [pendingRemoval, setPendingRemoval] = useState<Book>();
  const favorites = books.filter((book) => book.isFavorite);

  return <VStack className="library-page" gap={5}>
    <VStack gap={1}>
      <Heading level={2}>收藏</Heading>
      <Text type="supporting" color="secondary">{favorites.length ? `已收藏 ${favorites.length} 本` : "收藏的书会集中在这里"}</Text>
    </VStack>
    {favorites.length ? <BookGrid books={favorites} label="收藏书籍" onToggleFavorite={(book) => toggleFavorite(book.id)} onRequestRemove={setPendingRemoval} /> : <Card className="empty-library" padding={5}><VStack align="center" gap={3}><Icon className="empty-icon" icon={Bookmark} /><Heading level={3}>还没有收藏的书</Heading><Text type="body" color="secondary">在书架里点开一本书的更多操作，选择「收藏」即可加入这里。</Text><Link to="/">去书架看看</Link></VStack></Card>}
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
