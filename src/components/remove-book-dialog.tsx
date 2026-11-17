import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import type { Book } from "../services/library";

/** Shared confirmation for removing a book from the local shelf. */
export function RemoveBookDialog({ book, onCancel, onConfirm }: {
  book?: Book;
  onCancel: () => void;
  onConfirm: (book: Book) => void;
}) {
  return <AlertDialog
    isOpen={Boolean(book)}
    onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}
    title="从书架移除？"
    description={book ? `《${book.title}》会从本机书架删除，阅读进度也会一并清除。` : ""}
    cancelLabel="取消"
    actionLabel="移除"
    onAction={() => { if (book) onConfirm(book); }}
  />;
}
