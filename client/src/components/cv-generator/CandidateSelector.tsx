'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, Heart, Baby, X } from 'lucide-react';
import { Candidate } from '@/types';

interface CandidateSelectorProps {
  candidates: Candidate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function CandidateSelector({ candidates, selectedId, onSelect }: CandidateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [maritalFilter, setMaritalFilter] = useState<'all' | 'single' | 'married'>('all');
  const [childrenFilter, setChildrenFilter] = useState<'all' | 'yes' | 'no'>('all');
  const ref = useRef<HTMLDivElement>(null);

  // Filter candidates based on Marital Status and Children options
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const rawMarital = (c.personalInfo?.maritalStatus || (c as any).maritalStatus || '').toString().toLowerCase().trim();
      const numKids = Number(c.personalInfo?.numberOfChildren ?? (c as any).numberOfChildren ?? 0);

      // Match Marital Status
      if (maritalFilter === 'single') {
        if (rawMarital !== 'single') return false;
      } else if (maritalFilter === 'married') {
        if (rawMarital !== 'married') return false;

        // Match Children filter when Married is selected
        if (childrenFilter === 'yes') {
          if (numKids <= 0) return false;
        } else if (childrenFilter === 'no') {
          if (numKids > 0) return false;
        }
      }

      // Match search query
      if (search.trim()) {
        const query = search.toLowerCase();
        const given = (c.passportData?.givenNames || '').toLowerCase();
        const surname = (c.passportData?.surname || '').toLowerCase();
        const passport = (c.passportData?.passportNumber || '').toLowerCase();
        const full = `${given} ${surname} ${passport}`;
        if (!full.includes(query)) return false;
      }

      return true;
    });
  }, [candidates, maritalFilter, childrenFilter, search]);

  const selected = candidates.find(c => c.id === selectedId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = (c: Candidate) => {
    const first = c.passportData?.givenNames?.[0] ?? '?';
    const last = c.passportData?.surname?.[0] ?? '?';
    return `${first}${last}`.toUpperCase();
  };

  const displayName = (c: Candidate) =>
    `${c.passportData?.givenNames ?? ''} ${c.passportData?.surname ?? ''}`.trim() || 'Unknown';

  const detailsLine = (c: Candidate) => {
    const pNo = c.passportData?.passportNumber ?? '';
    const nat = c.passportData?.nationality ?? '';
    const marital = c.personalInfo?.maritalStatus || (c as any).maritalStatus || '';
    const numKids = Number(c.personalInfo?.numberOfChildren ?? (c as any).numberOfChildren ?? 0);
    let maritalInfo = marital;
    if (marital.toLowerCase() === 'married') {
      maritalInfo = numKids > 0 ? `Married (${numKids} ${numKids === 1 ? 'child' : 'children'})` : 'Married (No children)';
    }
    return [pNo, nat, maritalInfo].filter(Boolean).join(' • ');
  };

  return (
    <div ref={ref} className="space-y-4">
      {/* Marital Status & Children Filter Panel */}
      <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
            <Heart size={14} className="text-primary" />
            Marital Status
          </label>
          {maritalFilter !== 'all' && (
            <button
              type="button"
              onClick={() => {
                setMaritalFilter('all');
                setChildrenFilter('all');
              }}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <X size={12} /> Clear Filter
            </button>
          )}
        </div>

        {/* Marital Status Options: All, Single, Married */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'single', label: 'Single' },
            { id: 'married', label: 'Married' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                const newStatus = opt.id as 'all' | 'single' | 'married';
                setMaritalFilter(newStatus);
                if (newStatus !== 'married') {
                  setChildrenFilter('all');
                }
              }}
              className={cn(
                'px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center',
                maritalFilter === opt.id
                  ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20'
                  : 'bg-white text-text-secondary border-border hover:border-primary/40 hover:bg-primary/5'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Children Filter: Only appears when "Married" is selected */}
        {maritalFilter === 'married' && (
          <div className="pt-2 border-t border-border/50 animate-fade-in space-y-2">
            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Baby size={13} className="text-primary" />
              Children Filter
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChildrenFilter(childrenFilter === 'yes' ? 'all' : 'yes')}
                className={cn(
                  'px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center',
                  childrenFilter === 'yes'
                    ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20'
                    : 'bg-white text-text-secondary border-border hover:border-primary/40 hover:bg-primary/5'
                )}
              >
                Have children
              </button>

              <button
                type="button"
                onClick={() => setChildrenFilter(childrenFilter === 'no' ? 'all' : 'no')}
                className={cn(
                  'px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center',
                  childrenFilter === 'no'
                    ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20'
                    : 'bg-white text-text-secondary border-border hover:border-primary/40 hover:bg-primary/5'
                )}
              >
                Don't have children
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Dropdown Selector */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-text-secondary">Select Candidate</label>
          <span className="text-xs font-semibold text-text-tertiary">
            {filteredCandidates.length} {filteredCandidates.length === 1 ? 'candidate' : 'candidates'} available
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-xl border bg-surface text-left transition-all duration-200 cursor-pointer',
            isOpen ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
          )}
        >
          {selected ? (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials(selected)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">{displayName(selected)}</p>
                <p className="text-xs text-text-tertiary truncate">{detailsLine(selected)}</p>
              </div>
            </div>
          ) : (
            <span className="text-sm text-text-tertiary">Choose a registered candidate...</span>
          )}
          <ChevronDown size={16} className={cn('text-text-tertiary transition-transform shrink-0 ml-2', isOpen && 'rotate-180')} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-xl shadow-xl z-50 animate-dropdown overflow-hidden">
            <div className="p-3 border-b border-border">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or passport..."
                autoFocus
                className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:border-primary bg-surface-hover"
              />
            </div>

            <div className="max-h-60 overflow-y-auto py-1">
              {filteredCandidates.length === 0 ? (
                <p className="px-4 py-3 text-sm text-text-tertiary text-center">
                  No candidates match the filter criteria
                </p>
              ) : (
                filteredCandidates.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelect(c.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2.5 text-left cursor-pointer hover:bg-primary-50 transition-colors',
                      selectedId === c.id && 'bg-primary-50'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-light to-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {initials(c)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{displayName(c)}</p>
                        <p className="text-xs text-text-tertiary truncate">{detailsLine(c)}</p>
                      </div>
                    </div>
                    {selectedId === c.id && <Check size={14} className="text-primary shrink-0 ml-2" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
