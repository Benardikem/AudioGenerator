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
import { GeneratedCommercial } from '../types';
import { ConfirmationModal } from './ConfirmationModal';

interface CampaignArchiveViewProps {
  savedCommercials: CommercialRecord[];
  activeCommercialId: string | null;
  onLoadCommercial: (comm: CommercialRecord) => void;
  onOpenStoryboard: (comm: CommercialRecord) => void;
  onDuplicateCommercial: (comm: CommercialRecord) => void;
  onDeleteCommercial: (id: string, title: string) => void;
  onNewCommercial: () => void;
  takes: GeneratedCommercial[];
  onSelectTake: (take: GeneratedCommercial) => void;
  activeTakeId?: string;
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
  activeCommercialId,
  onLoadCommercial,
  onOpenStoryboard,
  onDuplicateCommercial,
  onDeleteCommercial,
  onNewCommercial,
  takes,
  onSelectTake,
  activeTakeId,
}) => {
  const [pendingDelete, setPendingDelete] = useState<CommercialRecord | null>(null);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-[#EAE3D4] p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#C6860C] uppercase tracking-wider mb-1">
            <Database className="w-4 h-4 text-[#E8A317]" />
            <span>Saved Ads</span>
          </div>
          <h2 className="text-xl font-bold text-[#181614]">Your saved commercials</h2>
          <p className="text-xs text-[#6B6256] mt-0.5">
            Open an ad to keep working on it, or go straight to its storyboard.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewCommercial}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Commercial</span>
        </button>
      </div>

      {/* Saved commercials table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#181614] flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#E8A317]" />
            Saved Ads ({savedCommercials.length})
          </h3>
          <span className="text-xs text-[#6B6256]">Saved on your studio server</span>
        </div>

        {savedCommercials.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EAE3D4] p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F4EEE2] mx-auto flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-[#E8A317]" />
            </div>
            <h4 className="text-sm font-bold text-[#181614]">No saved ads yet</h4>
            <p className="text-xs text-[#6B6256] max-w-sm mx-auto">
              Use the "Save" button in the top bar to keep the ad you're working on.
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
                  <th className={th}>Title</th>
                  <th className={th}>Voice</th>
                  <th className={th}>Audio</th>
                  <th className={th}>Scenes</th>
                  <th className={th}>Format</th>
                  <th className={th}>Last saved</th>
                  <th className={`${th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE3D4]">
                {savedCommercials.map((comm) => {
                  const isActive = activeCommercialId === comm.id;
                  return (
                    <tr key={comm.id} className={isActive ? 'bg-[#FBEFD2]/50' : 'hover:bg-[#FBF8F1]'}>
                      <td className={`${td} max-w-[280px]`}>
                        <div className="font-bold truncate" title={comm.title}>
                          {comm.title}
                        </div>
                        {isActive && (
                          <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-[#C6860C]">
                            Open now
                          </span>
                        )}
                      </td>
                      <td className={td}>{comm.voiceName || comm.voice}</td>
                      <td className={td}>
                        {comm.audioUrl ? (
                          <span className="font-mono">{comm.duration ? `${comm.duration}s` : 'Yes'}</span>
                        ) : (
                          <span className="text-[#6B6256]">None yet</span>
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
                            title={isActive ? 'Discard unsaved changes and reload the saved version' : 'Open this ad in the studio'}
                          >
                            {isActive ? <RotateCcw className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            {isActive ? 'Reload saved' : 'Open'}
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

      {/* Session Takes History */}
      {takes.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#EAE3D4] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#181614] flex items-center gap-2">
              <History className="w-4 h-4 text-[#E8A317]" />
              Session Audio Takes ({takes.length})
            </h3>
            <span className="text-xs text-[#6B6256]">Audio takes recorded in this session</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {takes.map((take, idx) => {
              const isActive = activeTakeId === take.id;
              return (
                <div
                  key={take.id}
                  className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all ${
                    isActive
                      ? 'bg-[#FBF8F1] border-[#E8A317] ring-1 ring-[#E8A317]'
                      : 'bg-white border-[#EAE3D4] hover:bg-[#FBF8F1]/50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-bold text-[#181614]">
                      <span>Take #{takes.length - idx}</span>
                      <span className="text-[10px] text-[#6B6256] font-mono">{take.duration}s</span>
                    </div>
                    <p className="text-[11px] text-[#6B6256] truncate mt-0.5">
                      {take.voiceName} ({take.timbre || 'baritone'})
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectTake(take)}
                    className="shrink-0 px-3 py-1.5 bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>{isActive ? 'Playing' : 'Use Take'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
