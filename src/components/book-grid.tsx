import type { Book } from "../services/library";
import { BookCard } from "./book-card";

/** The shelf grid. */
export function BookGrid({ books, label, onToggleFavorite, onRequestRemove }: {
  books: Book[];
  label: string;
  onToggleFavorite: (book: Book) => void;
  onRequestRemove: (book: Book) => void;
}) {
  return <section className="book-grid" aria-label={label}>
    {books.map((book) => (
      <BookCard key={book.id} book={book} onToggleFavorite={onToggleFavorite} onRequestRemove={onRequestRemove} />
    ))}
  </section>;
}
