import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  Play,
  Clock,
  Sparkles,
  Check,
  X,
  Volume2,
  Calendar,
  Layers,
  ChevronRight,
  Save,
  RotateCcw,
  Copy,
} from 'lucide-react';
import { CommercialRecord } from '../lib/commercialsDb';
import { AdvertScene } from '../types';

interface CommercialsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  commercials: CommercialRecord[];
  activeCommercialId: string | null;
  onLoadCommercial: (commercial: CommercialRecord) => void;
  onSaveCurrent: (title: string) => Promise<void>;
  onDeleteCommercial: (id: string) => Promise<void>;
  onDuplicateCommercial?: (commercial: CommercialRecord) => Promise<void>;
  onNewCommercial: () => void;
  isSaving: boolean;
  currentTitle: string;
}

export function CommercialsDrawer({
  isOpen,
  onClose,
  commercials,
  activeCommercialId,
  onLoadCommercial,
  onSaveCurrent,
  onDeleteCommercial,
  onDuplicateCommercial,
  onNewCommercial,
  isSaving,
  currentTitle,
}: CommercialsDrawerProps) {
  const [saveTitleInput, setSaveTitleInput] = useState(currentTitle);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTitleInput.trim()) return;
    await onSaveCurrent(saveTitleInput.trim());
    setShowSaveModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-[#FDFBF7] h-full shadow-2xl flex flex-col border-l border-[#EAE3D4] animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-[#EAE3D4] bg-[#F7F2E7]/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E8A317]/20 border border-[#E8A317]/40 flex items-center justify-center text-[#181614]">
              <FolderOpen className="w-4 h-4 text-[#C6860C]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#181614] leading-tight">Campaign Archive</h2>
              <p className="text-[11px] text-[#6B6256]">Database of saved & past commercials</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B6256] hover:text-[#181614] hover:bg-[#EAE3D4]/60 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-b border-[#EAE3D4] bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSaveTitleInput(currentTitle || 'LegitAfrica — New Ad Campaign');
              setShowSaveModal(true);
            }}
            disabled={isSaving}
            className="flex-1 py-2 px-3 rounded-xl bg-[#E8A317] hover:bg-[#C6860C] text-[#181614] font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Active Campaign</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onNewCommercial();
              onClose();
            }}
            className="py-2 px-3 rounded-xl bg-[#F7F2E7] hover:bg-[#EAE3D4] text-[#181614] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#EAE3D4] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#C6860C]" />
            <span>New Commercial</span>
          </button>
        </div>

        {/* Save Title Modal */}
        {showSaveModal && (
          <div className="p-4 bg-[#F7F2E7] border-b border-[#EAE3D4] text-left animate-in fade-in">
            <form onSubmit={handleSaveSubmit} className="space-y-2">
              <label htmlFor="save-title-input" className="block text-xs font-bold text-[#181614]">
                Campaign Title
              </label>
              <input
                id="save-title-input"
                type="text"
                value={saveTitleInput}
                onChange={(e) => setSaveTitleInput(e.target.value)}
                placeholder="e.g., LegitAfrica — Pidgin Baritone Promo"
                className="w-full text-xs py-2 px-3 rounded-lg border border-[#DACFBE] bg-white text-[#181614] focus:outline-none focus:border-[#E8A317]"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-2.5 py-1 text-xs font-semibold text-[#6B6256] hover:bg-[#EAE3D4] rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !saveTitleInput.trim()}
                  className="px-3 py-1 text-xs font-bold bg-[#181614] text-white hover:bg-[#2A2622] rounded-md disabled:opacity-50"
                >
                  {isSaving ? 'Saving to Database...' : 'Confirm Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Commercials List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {commercials.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EAE3D4]/50 border border-[#DACFBE] mx-auto flex items-center justify-center text-[#6B6256]">
                <Layers className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-[#181614]">No Saved Commercials Yet</p>
              <p className="text-[11px] text-[#6B6256] max-w-xs mx-auto">
                Save your current ad script, scene storyboard, and generated audio so you can preview, edit, or re-export it at any time.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSaveTitleInput(currentTitle || 'LegitAfrica — Original Pidgin Ad');
                  setShowSaveModal(true);
                }}
                className="mt-2 py-2 px-4 text-xs font-bold rounded-xl bg-[#E8A317] text-[#181614] hover:bg-[#C6860C]"
              >
                Save This Commercial Now
              </button>
            </div>
          ) : (
            commercials.map((comm) => {
              const isActive = comm.id === activeCommercialId;
              let parsedScenesCount = 8;
              try {
                if (comm.scenes) {
                  const s = JSON.parse(comm.scenes);
                  if (Array.isArray(s)) parsedScenesCount = s.length;
                }
              } catch (_) {}

              const dateStr = comm.updatedAt || comm.createdAt;
              const formattedDate = dateStr
                ? new Date(dateStr).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent';

              return (
                <div
                  key={comm.id}
                  className={`p-3.5 rounded-2xl border transition-all text-left relative group ${
                    isActive
                      ? 'bg-white border-[#E8A317] ring-2 ring-[#E8A317]/20 shadow-xs'
                      : 'bg-white/80 hover:bg-white border-[#EAE3D4] hover:border-[#DACFBE] shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs font-bold text-[#181614] truncate">{comm.title}</h3>
                        {isActive && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#E8A317]/20 text-[#C6860C]">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#6B6256] flex-wrap">
                        <span className="flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-[#C6860C]" />
                          <span>{comm.voiceName || comm.voice}</span>
                        </span>
                        <span>•</span>
                        <span>{comm.style.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>{parsedScenesCount} scenes</span>
                        {comm.duration ? (
                          <>
                            <span>•</span>
                            <span className="font-mono">{Math.round(comm.duration)}s</span>
                          </>
                        ) : null}
                      </div>

                      {/* Script Preview Snippet */}
                      <p className="text-[11px] text-[#4A4237] mt-2 line-clamp-2 italic bg-[#F7F2E7]/60 p-2 rounded-lg border border-[#EAE3D4]/60">
                        "{comm.script.slice(0, 140)}..."
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onDuplicateCommercial && (
                        <button
                          type="button"
                          onClick={() => onDuplicateCommercial(comm)}
                          className="p-1 text-[#8C8275] hover:text-[#181614] hover:bg-[#EAE3D4]/50 rounded-md transition-colors"
                          title="Duplicate as new variation"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteCommercial(comm.id)}
                        className="p-1 text-[#DACFBE] hover:text-red-600 rounded-md transition-colors"
                        title="Delete commercial from database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Footer & Load Action */}
                  <div className="mt-3 pt-2.5 border-t border-[#EAE3D4]/70 flex items-center justify-between">
                    <span className="text-[10px] text-[#8C8275] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formattedDate}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {onDuplicateCommercial && (
                        <button
                          type="button"
                          onClick={() => onDuplicateCommercial(comm)}
                          className="py-1 px-2.5 text-[11px] font-bold rounded-lg bg-[#F7F2E7] hover:bg-[#EAE3D4] text-[#181614] border border-[#EAE3D4] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Fork this campaign to create an A/B test variation"
                        >
                          <Copy className="w-3 h-3 text-[#C6860C]" />
                          <span>Duplicate</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onLoadCommercial(comm);
                          onClose();
                        }}
                        className="py-1 px-3 text-xs font-bold rounded-lg bg-[#181614] hover:bg-[#2A2622] text-white flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>{isActive ? 'Reload Scene' : 'Open & Preview'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#EAE3D4] bg-[#F7F2E7] text-center">
          <p className="text-[10px] text-[#6B6256]">
            Connected to Cloud Database (Postgres/Firestore ready) • Ready for Subdomain Deployment
          </p>
        </div>
      </div>
    </div>
  );
}
