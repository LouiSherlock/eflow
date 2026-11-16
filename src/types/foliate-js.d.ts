declare module "foliate-js/view.js" {
  export function makeBook(file: File | Blob | string): Promise<{
    metadata?: { title?: unknown; author?: unknown };
    getCover?: () => Promise<Blob | null>;
  }>;
}
