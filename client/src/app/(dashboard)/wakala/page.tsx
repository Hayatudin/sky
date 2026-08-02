'use client';

import React, { useState } from 'react';
import { useCandidates } from '@/hooks/useCandidates';
import { useSession } from '@/lib/auth-client';
import { getUserMajorAgency } from '@/lib/cv-templates';
import { api } from '@/lib/api';
import { 
  FileText, 
  Search, 
  Download, 
  Check, 
  X, 
  Loader2, 
  ShieldAlert, 
  UserCheck 
} from 'lucide-react';
import { TableSkeleton } from '@/components/ui/TableSkeleton';

export default function WakalaPage() {
  const { data: session } = useSession();
  const userAgency = getUserMajorAgency(session?.user);
  const isFenero = userAgency.toLowerCase().includes('fenero');

  const { candidates: allCandidates, isLoading, mutate } = useCandidates();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [appInputVal, setAppInputVal] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter candidates: Visa Selected only
  const visaSelectedCandidates = (Array.isArray(allCandidates) ? allCandidates : []).filter((c: any) => {
    if (c.processStatus === 'Arrived') return false;
    return c.isRequested || c.visaSelected || c.status === 'visa selected';
  });

  // Apply search query filter (Name, Passport, Application Number)
  const filteredCandidates = visaSelectedCandidates.filter((c: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${c.givenNames || c.passportData?.givenNames || ''} ${c.surname || c.passportData?.surname || ''}`.toLowerCase();
    const passNo = (c.passportNumber || c.passportData?.passportNumber || '').toLowerCase();
    const appNo = (c.applicationNumber || '').toLowerCase();
    return fullName.includes(q) || passNo.includes(q) || appNo.includes(q);
  });

  // Save Application Number
  const handleSaveApplicationNumber = async (candidateId: string, value: string) => {
    setIsSaving(true);
    try {
      const cleanVal = value.trim() || null;
      const res = await api(`/api/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationNumber: cleanVal }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update application number');
      }

      mutate((prev: any[]) =>
        prev.map((item: any) =>
          item.id === candidateId ? { ...item, applicationNumber: cleanVal } : item
        )
      );

      setEditingAppId(null);
      setAppInputVal('');
    } catch (err: any) {
      alert(err.message || 'Error updating application number');
    } finally {
      setIsSaving(false);
    }
  };

  // Excel Export Handler (Exact order: Name, Application Number, Passport)
  const handleExportExcel = () => {
    if (filteredCandidates.length === 0) {
      alert('No candidates available to export.');
      return;
    }

    const headers = ['Name', 'Application Number', 'Passport'];

    const rows = filteredCandidates.map((c: any) => {
      const fullName = `${c.givenNames || c.passportData?.givenNames || ''} ${c.surname || c.passportData?.surname || ''}`.trim().toUpperCase();
      const appNo = c.applicationNumber || '—';
      const passNo = c.passportNumber || c.passportData?.passportNumber || '—';
      return [fullName, appNo, passNo];
    });

    // Custom column widths
    const colWidths = headers.map((header, colIndex) => {
      let maxLen = header.length;
      rows.forEach(row => {
        const val = row[colIndex] || '';
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      });
      return Math.min(Math.max(maxLen * 10 + 40, 120), 400);
    });

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Wakala Candidates</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #4f46e5; color: #ffffff; font-weight: bold; border: 0.5pt solid #3730a3; text-align: left; }
          td { border: 0.5pt solid #e2e8f0; white-space: nowrap; }
          th, td { padding: 10px 14px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <table>
          <colgroup>
            ${colWidths.map(w => `<col width="${w}" style="width: ${w}px;" />`).join('\n')}
          </colgroup>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(val => `<td>${val === null || val === undefined ? '' : String(val)}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Wakala_Visa_Selected_Candidates_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isFenero) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <ShieldAlert size={40} className="text-amber-600 mx-auto" />
          <h2 className="text-lg font-bold text-amber-900">Access Restricted</h2>
          <p className="text-sm text-amber-700 max-w-md mx-auto">
            The Wakala feature is strictly reserved for users under the Fenero Major Agency.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── TOP HEADER & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <UserCheck size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary tracking-tight">Wakala Candidates</h1>
              <p className="text-xs text-text-tertiary">
                Visa-selected candidates roster & application number management
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer select-none active:scale-95"
          >
            <Download size={15} />
            Export Excel
          </button>
        </div>
      </div>

      {/* ── SEARCH & STATS ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Name, Passport or App No..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="text-xs text-text-secondary font-medium self-end sm:self-center">
          Showing <span className="font-bold text-indigo-600">{filteredCandidates.length}</span> of <span className="font-bold text-text-primary">{visaSelectedCandidates.length}</span> visa selected candidates
        </div>
      </div>

      {/* ── CANDIDATES TABLE ── */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <TableSkeleton cols={3} rows={6} />
        ) : filteredCandidates.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText size={36} className="text-text-tertiary mx-auto opacity-50" />
            <p className="text-sm font-semibold text-text-secondary">No visa selected candidates found</p>
            <p className="text-xs text-text-tertiary max-w-sm mx-auto">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Candidates marked as "visa selected" will automatically appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Passport</th>
                  <th className="px-6 py-3.5">Application Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {filteredCandidates.map((c: any) => {
                  const fullName = `${c.givenNames || c.passportData?.givenNames || ''} ${c.surname || c.passportData?.surname || ''}`.trim() || 'UNNAMED CANDIDATE';
                  const passNo = c.passportNumber || c.passportData?.passportNumber || '—';
                  const isEditingThis = editingAppId === c.id;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* COLUMN 1: NAME */}
                      <td className="px-6 py-4 font-bold text-text-primary uppercase tracking-wide">
                        {fullName}
                      </td>

                      {/* COLUMN 2: PASSPORT */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-700 tracking-wider">
                        {passNo}
                      </td>

                      {/* COLUMN 3: APPLICATION NUMBER */}
                      <td className="px-6 py-4">
                        {isEditingThis ? (
                          <div className="flex items-center gap-2 max-w-xs">
                            <input
                              type="text"
                              value={appInputVal}
                              onChange={(e) => setAppInputVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveApplicationNumber(c.id, appInputVal);
                                } else if (e.key === 'Escape') {
                                  setEditingAppId(null);
                                }
                              }}
                              autoFocus
                              placeholder="Enter Application No..."
                              disabled={isSaving}
                              className="px-3 py-1.5 text-xs border border-indigo-300 rounded-lg bg-white text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full"
                            />
                            <button
                              onClick={() => handleSaveApplicationNumber(c.id, appInputVal)}
                              disabled={isSaving}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Save Application Number"
                            >
                              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            </button>
                            <button
                              onClick={() => setEditingAppId(null)}
                              disabled={isSaving}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : c.applicationNumber ? (
                          <div
                            onClick={() => {
                              setEditingAppId(c.id);
                              setAppInputVal(c.applicationNumber || '');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100/80 hover:bg-indigo-100/60 transition-colors cursor-pointer group"
                            title="Click to edit application number"
                          >
                            <span className="font-mono font-bold text-indigo-700 tracking-wider">
                              {c.applicationNumber}
                            </span>
                            <span className="text-[10px] text-indigo-400 group-hover:text-indigo-600 font-sans font-normal ml-1">
                              (edit)
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingAppId(c.id);
                              setAppInputVal('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-all select-none"
                          >
                            <span>+ Add</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
