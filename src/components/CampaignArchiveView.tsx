import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Play,
  Copy,
  Trash2,
  Layers,
  ArrowUpRight,
  RotateCcw,
  Database,
  History,
} from 'lucide-react';
import { CommercialRecord } from '../lib/commercialsDb';
import { ConfirmationModal } from './ConfirmationModal';

interface CampaignArchiveViewProps {
  savedCommercials: CommercialRecord[];
  onLoadCommercial: (comm: CommercialRecord) => void;
  onOpenStoryboard: (comm: CommercialRecord) => void;
  onDuplicateCommercial: (comm: CommercialRecord) => void;
  onDeleteCommercial: (id: string, title: string) => void;
  onNewCommercial: () => void;
}

function sceneCount(comm: CommercialRecord) {
  if (!comm.scenes) return 0;
  try {
    const parsed = JSON.parse(comm.scenes);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function formatSaved(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const th = 'px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#6B6256] whitespace-nowrap';
const td = 'px-4 py-3 text-xs text-[#181614] whitespace-nowrap';
const actionBtn =
  'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-xs border transition-colors cursor-pointer';

export const CampaignArchiveView: React.FC<CampaignArchiveViewProps> = ({
  savedCommercials,
  onLoadCommercial,
  onOpenStoryboard,
  onDuplicateCommercial,
  onDeleteCommercial,
  onNewCommercial,
}) => {
  const [pendingDelete, setPendingDelete] = useState<CommercialRecord | null>(null);

  return (
    <div className="space-y-8">
      {/* Saved commercials table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#181614] flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#E8A317]" />
            Your ads ({savedCommercials.length})
          </h3>
        </div>

        {savedCommercials.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EAE3D4] p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F4EEE2] mx-auto flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-[#E8A317]" />
            </div>
            <h4 className="text-sm font-bold text-[#181614]">No saved ads yet</h4>
            <p className="text-xs text-[#6B6256] max-w-sm mx-auto">
              Press New Ad to make your first commercial.
            </p>
            <button
              type="button"
              onClick={onNewCommercial}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E8A317] text-[#181614] rounded-xl font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start First Ad</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#EAE3D4] shadow-xs overflow-x-auto">
            <table className="min-w-full divide-y divide-[#EAE3D4]">
              <thead className="bg-[#FBF8F1]">
                <tr>
                  <th className={th}>Ad</th>
                  <th className={th}>Voice</th>
                  <th className={th}>Voiceover</th>
                  <th className={th}>Scenes</th>
                  <th className={th}>Format</th>
                  <th className={th}>Last saved</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE3D4]">
                {savedCommercials.map((comm) => {
                  return (
                    <tr key={comm.id} className="hover:bg-[#FBF8F1]">
                      <td className={`${td} max-w-[280px]`}>
                        <div className="font-bold truncate" title={comm.title}>
                          {comm.title}
                        </div>
                      </td>
                      <td className={td}>{comm.voiceName || comm.voice}</td>
                      <td className={td}>
                        {comm.audioUrl ? (
                          <span className="font-mono">{comm.duration ? `${comm.duration}s` : 'Saved'}</span>
                        ) : (
                          <span
                            className="text-[#6B6256]"
                            title="No voiceover saved with this ad. Generate one in Script & Voice, then press Save."
                          >
                            Not generated
                          </span>
                        )}
                      </td>
                      <td className={`${td} font-mono`}>{sceneCount(comm)}</td>
                      <td className={`${td} font-mono`}>{comm.aspectRatio || '4:5'}</td>
                      <td className={`${td} text-[#6B6256]`}>{formatSaved(comm.updatedAt || comm.createdAt)}</td>
                      <td className={`${td} text-right`}>
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onLoadCommercial(comm)}
                            className={`${actionBtn} bg-[#E8A317] hover:bg-[#C6860C] border-[#E8A317] text-[#181614]`}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenStoryboard(comm)}
                            className={`${actionBtn} bg-[#F4EEE2] hover:bg-[#EAE3D4] border-[#EAE3D4] text-[#181614]`}
                          >
                            <Layers className="w-3.5 h-3.5 text-[#C6860C]" />
                            Storyboard
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateCommercial(comm)}
                            className={`${actionBtn} bg-white hover:bg-[#F4EEE2] border-[#EAE3D4] text-[#181614]`}
                            title="Make a copy you can change without touching the original"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(comm)}
                            className={`${actionBtn} bg-white hover:bg-red-50 border-[#EAE3D4] text-[#6B6256] hover:text-red-600`}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={pendingDelete !== null}
        title="Delete this ad?"
        message={`"${pendingDelete?.title ?? ''}" and its saved audio and storyboard will be permanently deleted.`}
        confirmLabel="Delete"
        isDestructive
        onConfirm={() => {
          if (pendingDelete) onDeleteCommercial(pendingDelete.id, pendingDelete.title);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
