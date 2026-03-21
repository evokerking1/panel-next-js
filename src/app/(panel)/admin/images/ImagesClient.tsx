'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Image {
  id: number;
  UUID: string;
  name: string;
  description: string;
  author: string;
  createdAt: string;
}

export default function ImagesClient({ images: initial }: { images: Image[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(initial);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      const data = await res.json();
      if (res.ok) {
        window.showToast?.(`Image "${data.name}" imported`, 'success');
        router.refresh();
      } else {
        window.showToast?.(data.error ?? 'Import failed', 'error');
      }
    } catch {
      window.showToast?.('Invalid egg JSON file', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function deleteImage(id: number, name: string) {
    if (!confirm(`Delete image "${name}"?`)) return;
    const res = await fetch(`/api/admin/images/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setImages((prev) => prev.filter((i) => i.id !== id));
      window.showToast?.('Image deleted', 'success');
    } else {
      window.showToast?.('Failed to delete image', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/images/store"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-700 dark:hover:bg-neutral-200 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.707V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
          </svg>
          Browse store
        </Link>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-white/5 transition disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          {uploading ? 'Importing…' : 'Import egg JSON'}
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleUpload} />
      </div>

      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-sm text-neutral-500 mb-2">No images yet.</p>
          <p className="text-xs text-neutral-400">Import an egg JSON or browse the store to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 dark:border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02]">
                <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 hidden md:table-cell">Author</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-neutral-500 hidden lg:table-cell">Added</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {images.map((img) => (
                <tr key={img.id} className="border-b border-neutral-100 dark:border-white/3 last:border-0 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-800 dark:text-white">{img.name}</p>
                    {img.description && <p className="text-xs text-neutral-400 truncate max-w-xs">{img.description}</p>}
                  </td>
                  <td className="px-5 py-3 text-neutral-500 hidden md:table-cell">{img.author || '—'}</td>
                  <td className="px-5 py-3 text-neutral-500 hidden lg:table-cell text-xs">
                    {new Date(img.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/images/edit/${img.id}`} className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition">Edit</Link>
                      <button onClick={() => deleteImage(img.id, img.name)} className="text-xs text-red-500 hover:text-red-700 transition">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
