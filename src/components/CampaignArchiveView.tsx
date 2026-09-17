import React from 'react';
import {
  FolderOpen,
  Plus,
  Play,
  Copy,
  Trash2,
  Calendar,
  Clock,
  Mic,
  FileText,
  Layers,
  ArrowUpRight,
  Database,
  History,
} from 'lucide-react';
import { CommercialRecord } from '../lib/commercialsDb';
import { GeneratedCommercial } from '../types';

interface CampaignArchiveViewProps {
  savedCommercials: CommercialRecord[];
  activeCommercialId: string | null;
  onLoadCommercial: (comm: CommercialRecord) => void;
  onDuplicateCommercial: (comm: CommercialRecord) => void;
  onDeleteCommercial: (id: string, title: string) => void;
  onNewCommercial: () => void;
  takes: GeneratedCommercial[];
  onSelectTake: (take: GeneratedCommercial) => void;
  activeTakeId?: string;
}

export const CampaignArchiveView: React.FC<CampaignArchiveViewProps> = ({
  savedCommercials,
  activeCommercialId,
  onLoadCommercial,
  onDuplicateCommercial,
  onDeleteCommercial,
  onNewCommercial,
  takes,
  onSelectTake,
  activeTakeId,
}) => {
  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-[#EAE3D4] p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#C6860C] uppercase tracking-wider mb-1">
            <Database className="w-4 h-4 text-[#E8A317]" />
            <span>Cloud Database Archive</span>
          </div>
          <h2 className="text-xl font-bold text-[#181614]">
            Commercial Campaign History & Saved Ads
          </h2>
          <p className="text-xs text-[#6B6256] mt-0.5">
            Retrieve past commercials, fork new variations, or restore previous audio takes without cluttering your studio.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewCommercial}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Commercial</span>
        </button>
      </div>

      {/* Saved Database Campaigns Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#181614] flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#E8A317]" />
            Saved Commercial Campaigns ({savedCommercials.length})
          </h3>
          <span className="text-xs text-[#6B6256]">
            Persisted securely to Firestore
          </span>
        </div>

        {savedCommercials.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EAE3D4] p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F4EEE2] text-[#6B6256] mx-auto flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-[#E8A317]" />
            </div>
            <h4 className="text-sm font-bold text-[#181614]">No saved campaigns yet</h4>
            <p className="text-xs text-[#6B6256] max-w-sm mx-auto">
              Save your current ad using the "Save Commercial" button in the top bar to store it in your cloud archive.
            </p>
            <button
              type="button"
              onClick={onNewCommercial}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E8A317] text-[#181614] rounded-xl font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Start First Campaign</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedCommercials.map((comm) => {
              const isActive = activeCommercialId === comm.id;
              const formattedDate = comm.createdAt
                ? new Date(comm.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <div
                  key={comm.id}
                  className={`bg-white rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                    isActive
                      ? 'border-[#E8A317] ring-2 ring-[#E8A317]/30 shadow-md'
                      : 'border-[#EAE3D4] hover:border-[#E8A317]/60 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {isActive && (
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#C6860C] bg-[#E8A317]/20 px-2 py-0.5 rounded-md mb-1.5">
                            Currently Active
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-[#181614] line-clamp-1">
                          {comm.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-[#6B6256] bg-[#F4EEE2] px-2 py-0.5 rounded-md shrink-0">
                        {comm.aspectRatio || '4:5'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6B6256]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#E8A317]" />
                        {formattedDate}
                      </span>
                      {comm.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#E8A317]" />
                          {comm.duration}s
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Mic className="w-3 h-3 text-[#E8A317]" />
                        {comm.voiceName || comm.voice}
                      </span>
                    </div>

                    <p className="text-xs text-[#6B6256] line-clamp-3 bg-[#FBF8F1] p-3 rounded-xl border border-[#EAE3D4]/60 font-sans leading-relaxed">
                      "{comm.script}"
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-[#EAE3D4] pt-3.5 mt-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onDuplicateCommercial(comm)}
                        className="p-1.5 rounded-lg bg-[#F4EEE2] hover:bg-[#EAE3D4] text-[#181614] text-xs transition-colors cursor-pointer"
                        title="Duplicate into a new draft"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCommercial(comm.id, comm.title)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-[#6B6256] hover:text-red-600 text-xs transition-colors cursor-pointer"
                        title="Delete from database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onLoadCommercial(comm)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#181614] text-white shadow-xs'
                          : 'bg-[#E8A317] hover:bg-[#C6860C] text-[#181614]'
                      }`}
                    >
                      <span>{isActive ? 'Active in Studio' : 'Load Campaign'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
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
            <span className="text-xs text-[#6B6256]">
              Audio takes recorded in this session
            </span>
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
                      <span className="text-[10px] text-[#6B6256] font-mono">
                        {take.duration}s
                      </span>
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
    </div>
  );
};
