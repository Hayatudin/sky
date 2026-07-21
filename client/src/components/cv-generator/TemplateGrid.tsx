'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { CVTemplate } from '@/types';

interface TemplateGridProps {
  templates: CVTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// ─── Rawasi Preview ─────────────────────────────────────────────────────────
// Deep navy + gold accent — classic formal agency look
function RawasiMiniPreview() {
  return (
    <div className="w-full h-full flex flex-col bg-[#f7f8fc] overflow-hidden">
      {/* Header band */}
      <div className="shrink-0" style={{ background: 'linear-gradient(135deg, #0d1b3e 0%, #1a3266 60%, #0d1b3e 100%)' }}>
        {/* Top gold stripe */}
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #c9a227, #f0d060, #c9a227)' }} />
        <div className="px-3 pt-2 pb-2 flex items-center gap-2">
          {/* Logo circle */}
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/30 flex items-center justify-center shrink-0">
            <span className="text-[7px] font-black text-[#f0d060] tracking-tight leading-none text-center">Rawasi</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[5.5px] font-bold text-white tracking-widest uppercase leading-tight truncate">
              RAWASI FOREIGN EMPLOYMENT
            </div>
            <div className="text-[3.5px] text-[#f0d060]/80 tracking-wider uppercase mt-0.5 truncate">
              Recruitment Agency — Est. 2018
            </div>
          </div>
        </div>
        {/* Bottom gold stripe */}
        <div className="h-[1.5px] w-full" style={{ background: 'linear-gradient(90deg, transparent, #c9a227 40%, #f0d060 50%, #c9a227 60%, transparent)' }} />
      </div>

      {/* Sub-header label */}
      <div className="bg-[#1a3266] px-3 py-[3px]">
        <div className="text-[4px] text-center text-white/70 tracking-[0.2em] uppercase font-medium">
          Application for Employment
        </div>
      </div>

      {/* Content area — abstract layout lines */}
      <div className="flex-1 px-3 py-2 flex gap-2">
        {/* Photo placeholder */}
        <div className="w-[26%] shrink-0 flex flex-col gap-1">
          <div className="rounded bg-[#dde3f0] flex-1 flex items-center justify-center">
            <svg className="w-3 h-3 text-[#8090b0]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
          <div className="rounded bg-[#dde3f0] h-[14px] flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-[#8090b0]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
        </div>
        {/* Info lines */}
        <div className="flex-1 flex flex-col justify-start gap-[3px] pt-0.5">
          {[80, 65, 75, 55, 70, 60, 50].map((w, i) => (
            <div
              key={i}
              className="h-[4px] rounded-sm"
              style={{
                width: `${w}%`,
                background: i % 3 === 0 ? '#c9a227' : i % 3 === 1 ? '#1a3266' : '#dde3f0',
                opacity: i % 3 === 2 ? 0.5 : 0.85,
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 bg-[#0d1b3e] px-3 py-1 flex items-center justify-between">
        <div className="h-[2px] w-[30%] rounded-full bg-[#c9a227]/60" />
        <div className="text-[3px] text-white/40 tracking-widest uppercase">Rawasi</div>
        <div className="h-[2px] w-[30%] rounded-full bg-[#c9a227]/60" />
      </div>
    </div>
  );
}

// ─── Azm Preview ─────────────────────────────────────────────────────────────
// Deep teal/emerald gradient — modern professional
function AzmMiniPreview() {
  return (
    <div className="w-full h-full flex flex-col bg-[#f4f9f8] overflow-hidden">
      {/* Full-bleed header */}
      <div
        className="shrink-0 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)' }}
      >
        {/* Diagonal accent */}
        <div
          className="absolute top-0 right-0 w-[50px] h-[50px] opacity-20"
          style={{
            background: 'linear-gradient(135deg, transparent 40%, #34d399 100%)',
          }}
        />
        {/* Circle pattern */}
        <div className="absolute bottom-[-10px] left-[-10px] w-[45px] h-[45px] rounded-full border-[6px] border-white/10" />
        <div className="absolute top-[-8px] right-[30px] w-[30px] h-[30px] rounded-full border-[4px] border-white/10" />

        <div className="relative px-3 pt-2.5 pb-2 flex items-center justify-between">
          <div>
            <div className="text-[6px] font-black text-white tracking-widest uppercase leading-tight">
              AZM ALINJAZ
            </div>
            <div className="text-[3.5px] text-emerald-200/80 tracking-wider uppercase mt-0.5">
              Recruitment Agency
            </div>
          </div>
          {/* Badge */}
          <div className="w-7 h-7 rounded-lg border border-white/30 bg-white/10 flex items-center justify-center">
            <span className="text-[5px] font-black text-emerald-200">AZM</span>
          </div>
        </div>
        {/* Accent bar */}
        <div className="h-[2px] w-full bg-gradient-to-r from-emerald-400/0 via-emerald-300 to-emerald-400/0" />
      </div>

      {/* Candidate strip */}
      <div className="bg-[#ecfdf5] px-3 py-[3.5px] border-b border-emerald-100 flex items-center gap-1.5">
        <div className="w-[18px] h-[18px] rounded-full bg-emerald-200/60 flex items-center justify-center shrink-0">
          <svg className="w-2.5 h-2.5 text-emerald-700" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
        <div className="flex flex-col gap-[2px]">
          <div className="w-[55px] h-[3px] rounded-full bg-emerald-800/30" />
          <div className="w-[35px] h-[2.5px] rounded-full bg-emerald-600/20" />
        </div>
      </div>

      {/* Content lines */}
      <div className="flex-1 px-3 py-2 flex flex-col gap-[3.5px]">
        {[
          { w: 85, color: '#064e3b', opacity: 0.8 },
          { w: 60, color: '#047857', opacity: 0.5 },
          { w: 90, color: '#064e3b', opacity: 0.8 },
          { w: 50, color: '#047857', opacity: 0.5 },
          { w: 75, color: '#064e3b', opacity: 0.8 },
          { w: 40, color: '#047857', opacity: 0.5 },
          { w: 80, color: '#064e3b', opacity: 0.8 },
          { w: 55, color: '#34d399', opacity: 0.4 },
        ].map(({ w, color, opacity }, i) => (
          <div key={i} className="h-[3.5px] rounded-full" style={{ width: `${w}%`, background: color, opacity }} />
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0 h-[10px] bg-[#064e3b]/90 flex items-center justify-center">
        <div className="text-[3px] text-emerald-200/60 tracking-[0.25em] uppercase">Azm Alinjaz Recruitment</div>
      </div>
    </div>
  );
}

// ─── Mazaya Preview ───────────────────────────────────────────────────────────
// Warm blue + slate — elegant dual-column
function MazayaMiniPreview() {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      {/* Header — split layout */}
      <div className="shrink-0 flex" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563a8 100%)' }}>
        {/* Left accent bar */}
        <div className="w-[4px] shrink-0" style={{ background: 'linear-gradient(180deg, #f59e0b, #fbbf24)' }} />
        <div className="flex-1 px-3 pt-2 pb-2 flex items-center justify-between">
          <div>
            <div className="text-[6.5px] font-black text-white tracking-wider uppercase leading-none">MAZAYA</div>
            <div className="text-[3.5px] text-blue-200/80 tracking-widest uppercase mt-0.5">Recruitment Agent</div>
          </div>
          {/* Star/emblem */}
          <div className="flex flex-col items-center gap-[2px]">
            <div className="w-6 h-6 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
              <svg className="w-3 h-3 text-[#fbbf24]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Amber accent line */}
      <div className="h-[2.5px] shrink-0" style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24 50%, #f59e0b)' }} />

      {/* Two-column body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-[35%] shrink-0 bg-[#1e3a5f]/8 border-r border-[#2563a8]/15 px-1.5 py-2 flex flex-col gap-1.5">
          {/* Photo */}
          <div className="w-full aspect-square rounded bg-[#dbeafe] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#2563a8]/50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
            </svg>
          </div>
          {/* Sidebar info dots */}
          {[70, 50, 80, 60].map((w, i) => (
            <div key={i} className="h-[3px] rounded-full" style={{ width: `${w}%`, background: '#2563a8', opacity: 0.3 + i * 0.1 }} />
          ))}
          {/* Divider */}
          <div className="h-[1px] bg-[#f59e0b]/40 my-0.5" />
          {[65, 45, 55].map((w, i) => (
            <div key={i} className="h-[3px] rounded-full" style={{ width: `${w}%`, background: '#1e3a5f', opacity: 0.25 }} />
          ))}
        </div>

        {/* Right main content */}
        <div className="flex-1 px-2 py-2 flex flex-col gap-[3.5px]">
          <div className="h-[3.5px] rounded-full bg-[#f59e0b]/70 w-full mb-1" />
          {[90, 65, 80, 55, 75, 60, 85, 50].map((w, i) => (
            <div
              key={i}
              className="h-[3px] rounded-full"
              style={{ width: `${w}%`, background: i % 2 === 0 ? '#1e3a5f' : '#2563a8', opacity: i % 2 === 0 ? 0.7 : 0.35 }}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 h-[9px] flex items-center justify-between px-2" style={{ background: 'linear-gradient(90deg, #1e3a5f, #2563a8)' }}>
        <div className="h-[1.5px] w-[25%] rounded-full bg-[#fbbf24]/60" />
        <div className="text-[3px] text-white/50 tracking-[0.2em] uppercase">Mazaya</div>
        <div className="h-[1.5px] w-[25%] rounded-full bg-[#fbbf24]/60" />
      </div>
    </div>
  );
}

// ─── North Gate Preview ──────────────────────────────────────────────────────
function NorthGateMiniPreview() {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      <div className="shrink-0 p-1 bg-sky-50 border-b border-sky-200 text-center">
        <div className="text-[5px] font-bold text-sky-800 uppercase">NORTH GATE</div>
        <div className="text-[3px] text-sky-600 uppercase">Recruitment Office</div>
      </div>
      <div className="flex-1 p-2 flex gap-1.5">
        <div className="w-1/3 bg-sky-100/50 rounded p-1 flex flex-col gap-1">
          <div className="w-full aspect-[3/4] bg-sky-200/50 rounded" />
          <div className="w-full h-2 bg-sky-200/30 rounded" />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="w-full h-2 bg-sky-100 rounded" />
          <div className="w-3/4 h-2 bg-sky-100 rounded" />
          <div className="w-5/6 h-2 bg-sky-100 rounded" />
          <div className="w-2/3 h-2 bg-sky-100 rounded" />
        </div>
      </div>
    </div>
  );
}

// ─── Daeyman Alawael Preview ────────────────────────────────────────────────
function DaeymanMiniPreview() {
  return (
    <div className="w-full h-full flex flex-col bg-white overflow-hidden">
      <div className="shrink-0 p-1 bg-teal-50 border-b border-teal-200 text-center">
        <div className="text-[5px] font-bold text-teal-800 uppercase">DAEYMAN ALAWAEL</div>
        <div className="text-[3px] text-teal-600 uppercase">Recruitment Agent</div>
      </div>
      <div className="flex-1 p-2 flex gap-1.5">
        <div className="w-1/3 bg-teal-100/50 rounded p-1 flex flex-col gap-1">
          <div className="w-full aspect-[3/4] bg-teal-200/50 rounded" />
          <div className="w-full h-2 bg-teal-200/30 rounded" />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <div className="w-full h-2 bg-teal-100 rounded" />
          <div className="w-3/4 h-2 bg-teal-100 rounded" />
          <div className="w-5/6 h-2 bg-teal-100 rounded" />
          <div className="w-2/3 h-2 bg-teal-100 rounded" />
        </div>
      </div>
    </div>
  );
}

const TEMPLATE_PREVIEWS: Record<string, React.FC> = {
  rawasi: RawasiMiniPreview,
  azm: AzmMiniPreview,
  mazaya: MazayaMiniPreview,
  northgate: NorthGateMiniPreview,
  daeyman: DaeymanMiniPreview,
};

// Per-template accent for the selection ring and dot
const TEMPLATE_ACCENTS: Record<string, { dot: string; ring: string; shadow: string }> = {
  rawasi:    { dot: 'bg-[#c9a227]',  ring: 'border-[#1a3266]', shadow: 'shadow-[#1a3266]/15' },
  azm:       { dot: 'bg-emerald-600', ring: 'border-emerald-600', shadow: 'shadow-emerald-600/15' },
  mazaya:    { dot: 'bg-[#2563a8]',  ring: 'border-[#2563a8]', shadow: 'shadow-[#2563a8]/15'  },
  northgate: { dot: 'bg-sky-600',    ring: 'border-sky-600', shadow: 'shadow-sky-600/15' },
  daeyman:   { dot: 'bg-teal-600',   ring: 'border-teal-600', shadow: 'shadow-teal-600/15' },
};

export default function TemplateGrid({ templates, selectedId, onSelect }: TemplateGridProps) {
  return (
    <div>
      <label className="text-sm font-medium text-text-secondary block mb-3">Choose CV Template</label>
      {/* 2-per-row grid */}
      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => {
          const isSelected = selectedId === template.id;
          const accent = TEMPLATE_ACCENTS[template.id] || {
            dot: 'bg-gray-500',
            ring: 'border-gray-400',
            shadow: 'shadow-gray-100',
          };
          const Preview = TEMPLATE_PREVIEWS[template.id];

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={cn(
                'relative rounded-xl overflow-hidden transition-all duration-200 cursor-pointer group text-left',
                'border-2',
                isSelected
                  ? `${accent.ring} shadow-lg ${accent.shadow} scale-[1.02]`
                  : 'border-border/60 hover:border-blue-300 hover:shadow-md hover:scale-[1.01]'
              )}
            >
              {/* Preview area */}
              <div className="aspect-[3/4] relative overflow-hidden">
                {Preview ? (
                  <Preview />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                    Preview
                  </div>
                )}

                {/* Hover shimmer */}
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/6 transition-all duration-200 pointer-events-none" />

                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md z-10"
                    style={{ background: accent.ring.replace('border-[', '').replace(']', '').replace('border-', '') }}
                  >
                    <Check size={9} className="text-white" strokeWidth={3.5} />
                  </div>
                )}
              </div>

              {/* Label strip */}
              <div className="px-3 py-2.5 bg-surface border-t border-border/50 flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full shrink-0', accent.dot)} />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text-primary truncate leading-tight">{template.name}</p>
                  <p className="text-[10.5px] text-text-tertiary truncate mt-0.5">{template.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
