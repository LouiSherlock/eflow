import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { Search } from "lucide-react";
import { BookGrid } from "../components/book-grid";
import { RemoveBookDialog } from "../components/remove-book-dialog";
import { type Book, useLibrary } from "../services/library";

export const Route = createFileRoute("/search")({ component: SearchPage });

function SearchPage() {
  const books = useLibrary((state) => state.books);
  const toggleFavorite = useLibrary((state) => state.toggleFavorite);
  const removeBook = useLibrary((state) => state.removeBook);
  const [query, setQuery] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<Book>();
  const keyword = query.trim().toLocaleLowerCase();
  const results = keyword
    ? books.filter((book) => `${book.title} ${book.author}`.toLocaleLowerCase().includes(keyword))
    : [];

  return <VStack gap={4} paddingBlock={4}>
    <TextInput label="搜索书名或作者" value={query} onChange={setQuery} placeholder="搜索书架" size="lg" hasAutoFocus />
    {keyword ? <>
      <HStack align="end" justify="between" gap={3}>
        <Heading level={3}>搜索结果</Heading>
        <Text type="supporting" color="secondary">{results.length} 本</Text>
      </HStack>
      {results.length ? <BookGrid books={results} label="搜索结果" onToggleFavorite={(book) => toggleFavorite(book.id)} onRequestRemove={setPendingRemoval} /> : <Card className="empty-library" padding={5}><VStack align="center" gap={3}><Icon className="empty-icon" icon={Search} /><Heading level={3}>没有找到这本书</Heading><Text type="body" color="secondary">换个书名或作者再试试。</Text></VStack></Card>}
    </> : <Card className="empty-library" padding={5}><VStack align="center" gap={3}><Icon className="empty-icon" icon={Search} /><Heading level={3}>搜索书架</Heading><Text type="body" color="secondary">输入书名或作者，查找已导入的书。</Text></VStack></Card>}
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
