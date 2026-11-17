import { makeBook } from "foliate-js/view.js";
import { create } from "zustand";

export type BookFormat = "EPUB" | "TXT";
export type Book = { id: string; title: string; author: string; format: BookFormat; size: number; progress: number; cfi?: string; isFavorite?: boolean; addedAt: number; updatedAt: number; cover?: Blob };
type StoredFile = { id: string; file: Blob; cover?: Blob };
type LibraryState = { books: Book[]; isReady: boolean; hydrate: () => Promise<void>; importBook: (file: File) => Promise<Book>; updateProgress: (id: string, progress: number, cfi?: string) => void; toggleFavorite: (id: string) => void; removeBook: (id: string) => Promise<void> };
const DB_NAME = "eflow-reader";
const STORE_NAME = "book-files";
const LIBRARY_KEY = "eflow-library-v2";

function openLibraryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openLibraryDb();
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}
async function saveFile(record: StoredFile) { await withStore("readwrite", (store) => store.put(record)); }
export async function getBookFile(id: string) { return withStore("readonly", (store) => store.get(id)) as Promise<StoredFile | undefined>; }
async function deleteBookFile(id: string) { await withStore("readwrite", (store) => store.delete(id)); }
function loadMetadata(): Book[] { try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? "[]") as Book[]; } catch { return []; } }
function saveMetadata(books: Book[]) { try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(books.map(({ cover: _cover, ...book }) => book))); } catch { /* In-memory state still works. */ } }
function humanText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(humanText).filter(Boolean).join("、");
  if (value && typeof value === "object") { const record = value as Record<string, unknown>; return humanText(record.name ?? Object.values(record)[0]); }
  return "";
}
function formatFrom(file: File): BookFormat | null { const extension = file.name.split(".").pop()?.toLowerCase(); return extension === "epub" ? "EPUB" : extension === "txt" ? "TXT" : null; }

export const useLibrary = create<LibraryState>((set, get) => ({
  books: [],
  isReady: false,
  hydrate: async () => {
    const metadata = loadMetadata();
    const books = await Promise.all(metadata.map(async (book) => ({ ...book, cover: (await getBookFile(book.id))?.cover })));
    set({ books, isReady: true });
  },
  importBook: async (file) => {
    const format = formatFrom(file);
    if (!format) throw new Error("仅支持 EPUB 和 TXT 文件。");
    const id = crypto.randomUUID();
    let title = file.name.replace(/\.[^.]+$/, "");
    let author = "未知作者";
    let cover: Blob | undefined;
    if (format === "EPUB") {
      const parsed = await makeBook(file);
      title = humanText(parsed.metadata?.title) || title;
      author = humanText(parsed.metadata?.author) || author;
      cover = await parsed.getCover?.() ?? undefined;
    }
    const book: Book = { id, title, author, format, size: file.size, progress: 0, addedAt: Date.now(), updatedAt: Date.now(), cover };
    await saveFile({ id, file, cover });
    const books = [book, ...get().books];
    saveMetadata(books);
    set({ books });
    return book;
  },
  updateProgress: (id, progress, cfi) => {
    const books = get().books.map((book) => book.id === id ? { ...book, progress, cfi: cfi ?? book.cfi, updatedAt: Date.now() } : book);
    saveMetadata(books);
    set({ books });
  },
  toggleFavorite: (id) => {
    const books = get().books.map((book) => book.id === id ? { ...book, isFavorite: !book.isFavorite } : book);
    saveMetadata(books);
    set({ books });
  },
  removeBook: async (id) => {
    await deleteBookFile(id);
    const books = get().books.filter((book) => book.id !== id);
    saveMetadata(books);
    set({ books });
  },
}));
