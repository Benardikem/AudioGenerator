import React, { useCallback, useEffect, useState } from 'react';
import { Film, Image as ImageIcon, Trash2, RefreshCw, HardDrive, AlertCircle } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

/**
 * Everything uploaded for adverts — scene photos and video clips — with the adverts using each
 * one, so files can be cleared out here rather than piling up unseen on the server.
 *
 * A file an advert still uses cannot be deleted: the server refuses and says which advert holds
 * it. Tidying up is therefore safe to do without checking anything first.
 */

interface MediaItem {
  url: string;
  kind: 'clip' | 'photo';
  label: string;
  bytes: number;
  uploadedAt: string;
  usedBy: string[];
}

const th = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#6B6256] whitespace-nowrap';
const td = 'px-4 py-3 text-xs text-[#181614]';

const formatSize = (bytes: number) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const MediaLibraryView: React.FC = () => {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [totals, setTotals] = useState({ totalBytes: 0, unusedBytes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null);
  const [clearUnused, setClearUnused] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/media', { credentials: 'same-origin' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The media library could not be read.');
      setItems(data.items || []);
      setTotals({ totalBytes: data.totalBytes || 0, unusedBytes: data.unusedBytes || 0 });
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'The media library could not be read.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (item: MediaItem) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/media?url=${encodeURIComponent(item.url)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The file could not be deleted.');
      setError(null);
      await load();
    } catch (err: any) {
      setError(err?.message || 'The file could not be deleted.');
    } finally {
      setBusy(false);
    }
  };

  const unused = items.filter((i) => i.usedBy.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#181614] flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#E8A317]" />
            Media ({items.length})
          </h3>
          <p className="text-xs text-[#6B6256] mt-1">
            Photos and video clips uploaded for your adverts. {formatSize(totals.totalBytes)} in all
            {unused.length > 0 && <> · {formatSize(totals.unusedBytes)} in {unused.length} unused file{unused.length === 1 ? '' : 's'}</>}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading || busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F4EEE2] text-[#181614] text-xs font-bold border border-[#EAE3D4] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {unused.length > 0 && (
            <button
              type="button"
              onClick={() => setClearUnused(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-[#6B6256] hover:text-red-600 text-xs font-bold border border-[#EAE3D4] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {unused.length} unused
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[#FDECEA] border border-red-200 text-xs font-semibold text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {items.length === 0 && !loading ? (
        <div className="bg-white rounded-3xl border border-[#EAE3D4] p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F4EEE2] mx-auto flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-[#E8A317]" />
          </div>
          <h4 className="text-sm font-bold text-[#181614]">Nothing uploaded yet</h4>
          <p className="text-xs text-[#6B6256] max-w-sm mx-auto">
            Photos and clips you add to a scene show up here, with the adverts using them.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EAE3D4] shadow-xs overflow-x-auto">
          <table className="min-w-full divide-y divide-[#EAE3D4]">
            <thead className="bg-[#FBF8F1]">
              <tr>
                <th className={th}>File</th>
                <th className={th}>Type</th>
                <th className={th}>Size</th>
                <th className={th}>Uploaded</th>
                <th className={th}>Used by</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D4]">
              {items.map((item) => (
                <tr key={item.url} className="hover:bg-[#FBF8F1]">
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-15 rounded-lg overflow-hidden border border-[#EAE3D4] shrink-0 bg-[#F4EEE2]">
                        {item.kind === 'clip' ? (
                          // metadata only: the poster frame is enough, and a list of clips should
                          // not pull tens of megabytes down to be looked at
                          <video src={item.url} preload="metadata" muted playsInline className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <span className="font-bold break-all">{item.label}</span>
                    </div>
                  </td>
                  <td className={td}>
                    <span className="inline-flex items-center gap-1 text-[#6B6256] font-semibold">
                      {item.kind === 'clip' ? <Film className="w-3.5 h-3.5 text-[#C6860C]" /> : <ImageIcon className="w-3.5 h-3.5 text-[#C6860C]" />}
                      {item.kind === 'clip' ? 'Video clip' : 'Photo'}
                    </span>
                  </td>
                  <td className={`${td} font-mono whitespace-nowrap`}>{formatSize(item.bytes)}</td>
                  <td className={`${td} text-[#6B6256] whitespace-nowrap`}>{formatDate(item.uploadedAt)}</td>
                  <td className={td}>
                    {item.usedBy.length === 0 ? (
                      <span className="text-[#6B6256]">Not used</span>
                    ) : (
                      <span className="font-semibold">{item.usedBy.join(', ')}</span>
                    )}
                  </td>
                  <td className={`${td} text-right`}>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(item)}
                      disabled={busy || item.usedBy.length > 0}
                      title={
                        item.usedBy.length > 0
                          ? `Used by ${item.usedBy.join(', ')}. Remove it from those adverts first.`
                          : 'Delete this file'
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-xs border border-[#EAE3D4] bg-white hover:bg-red-50 text-[#6B6256] hover:text-red-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:bg-white disabled:hover:text-[#6B6256]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationModal
        isOpen={pendingDelete !== null}
        title="Delete this file?"
        message={`"${pendingDelete?.label ?? ''}" will be permanently deleted from the studio server. No saved advert uses it.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={() => {
          if (pendingDelete) remove(pendingDelete);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmationModal
        isOpen={clearUnused}
        title={`Delete ${unused.length} unused file${unused.length === 1 ? '' : 's'}?`}
        message={`${formatSize(totals.unusedBytes)} will be permanently deleted. Only files no saved advert uses are affected.`}
        confirmLabel="Delete them"
        isDestructive
        onConfirm={async () => {
          setClearUnused(false);
          setBusy(true);
          for (const item of unused) {
            await fetch(`/api/media?url=${encodeURIComponent(item.url)}`, { method: 'DELETE', credentials: 'same-origin' }).catch(() => {});
          }
          setBusy(false);
          load();
        }}
        onCancel={() => setClearUnused(false)}
      />
    </div>
  );
};
