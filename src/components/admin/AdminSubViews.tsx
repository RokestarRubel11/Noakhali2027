import React, { useState } from 'react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Globe,
  LogOut,
  Plus,
  Trash2,
  TrendingUp,
  Vote,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { LanguageToggle } from '../LanguageToggle.tsx';
import { apiRequest, getAdminToken } from '../../lib/api.ts';
import {
  exportExcelWorkbook,
  exportLedgerPdf,
  exportMembersPdf,
  exportPaymentsPdf,
  exportSummaryPdf,
} from '../../lib/reports.ts';
import type { AdminOverviewResponse, InvestmentProject, SocietySettings } from '../../types.ts';
import { StatusText } from '../StatusText.tsx';

interface SubViewProps {
  data: AdminOverviewResponse;
  onReload: () => Promise<void>;
  onToast: (msg: string, isError?: boolean) => void;
}

export function AdminLedgerView({ data, onReload, onToast }: SubViewProps) {
  const { t, formatCurrency, formatDate } = useLanguage();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showModal, setShowModal] = useState(false);

  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('General');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = data.ledger.filter((item) =>
    filterType === 'all' ? true : item.type === filterType
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/admin/ledger', {
        method: 'POST',
        token: getAdminToken(),
        body: JSON.stringify({
          type,
          category,
          title,
          amount: Number(amount),
          date,
          description,
        }),
      });
      setTitle('');
      setAmount('');
      setDescription('');
      setShowModal(false);
      await onReload();
      onToast(t('save'));
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/admin/ledger/${id}`, {
        method: 'DELETE',
        token: getAdminToken(),
      });
      await onReload();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">{t('ledgerTitle')}</h2>
          <p className="text-sm text-slate-600 mt-0.5">{t('ledgerSub')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addEntryBtn')}</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">{t('totalIncomeLabel')}</p>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
            {formatCurrency(data.stats.totalIncome)}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">{t('totalExpenseLabel')}</p>
          <p className="text-2xl font-bold text-red-700 tabular-nums mt-1">
            {formatCurrency(data.stats.totalExpense)}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500">{t('netCashBalance')}</p>
          <p className="text-2xl font-bold text-navy-900 tabular-nums mt-1">
            {formatCurrency(data.stats.totalIncome - data.stats.totalExpense)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap sm:inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
        {(['all', 'income', 'expense'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterType(tab)}
            className={`flex-1 sm:flex-initial min-h-[40px] px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              filterType === tab
                ? 'bg-white text-navy-900 shadow-xs'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {/* Ledger List (Mobile Cards + Desktop Table) */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">{t('noRecords')}</div>
        ) : (
          <>
            {/* Mobile Touch Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.map((entry) => (
                <div key={entry.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusText status={entry.type} />
                      <span className="text-xs text-slate-500 tabular-nums">
                        {formatDate(entry.date)}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-navy-900 break-words">
                      {entry.title}
                    </div>
                    <div className="text-xs text-slate-500">{entry.category}</div>
                    {entry.description && (
                      <div className="text-xs text-slate-500">{entry.description}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={`text-base font-bold tabular-nums whitespace-nowrap ${
                        entry.type === 'income' ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {entry.type === 'income' ? '+' : '-'}
                      {formatCurrency(entry.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] text-slate-400 hover:text-red-600 bg-slate-50 rounded-xl cursor-pointer"
                      title={t('deleteEntry')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">{t('date')}</th>
                    <th className="py-3 px-4">{t('entryType')}</th>
                    <th className="py-3 px-4">{t('category')}</th>
                    <th className="py-3 px-4">{t('entryTitle')}</th>
                    <th className="py-3 px-4 text-right">{t('amount')}</th>
                    <th className="py-3 px-4 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap tabular-nums">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusText status={entry.type} />
                      </td>
                      <td className="py-3 px-4 text-slate-700">{entry.category}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-navy-900">{entry.title}</div>
                        {entry.description && (
                          <div className="text-xs text-slate-500">{entry.description}</div>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-semibold tabular-nums whitespace-nowrap ${
                          entry.type === 'income' ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {entry.type === 'income' ? '+' : '-'}
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(entry.id)}
                          className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                          title={t('deleteEntry')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900 mb-4">{t('addEntryBtn')}</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('entryType')}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm bg-white"
                  >
                    <option value="income">{t('income')}</option>
                    <option value="expense">{t('expense')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('date')}
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('category')}
                </label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('entryTitle')}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('amountBdtLabel')}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('description')}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-navy-900 text-white text-sm font-semibold cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminInvestmentsView({ data, onReload, onToast }: SubViewProps) {
  const { lang, t, formatCurrency, formatDate } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<InvestmentProject | null>(null);

  const [titleEn, setTitleEn] = useState('');
  const [titleBn, setTitleBn] = useState('');
  const [category, setCategory] = useState('Real Estate / SME');
  const [investedAmount, setInvestedAmount] = useState('');
  const [expectedReturnRate, setExpectedReturnRate] = useState('12');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [maturityDate, setMaturityDate] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionBn, setDescriptionBn] = useState('');

  const [editStatus, setEditStatus] = useState<'active' | 'completed' | 'planned'>('active');
  const [actualReturnAmount, setActualReturnAmount] = useState('0');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/investments', {
        method: 'POST',
        token: getAdminToken(),
        body: JSON.stringify({
          titleEn,
          titleBn,
          category,
          investedAmount: Number(investedAmount),
          expectedReturnRate: Number(expectedReturnRate),
          startDate,
          maturityDate,
          status: 'active',
          descriptionEn,
          descriptionBn,
        }),
      });
      setShowCreate(false);
      setTitleEn('');
      setTitleBn('');
      setInvestedAmount('');
      setDescriptionEn('');
      setDescriptionBn('');
      await onReload();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await apiRequest(`/api/admin/investments/${editing.id}`, {
        method: 'PATCH',
        token: getAdminToken(),
        body: JSON.stringify({
          status: editStatus,
          actualReturnAmount: Number(actualReturnAmount),
        }),
      });
      setEditing(null);
      await onReload();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">{t('investmentTitle')}</h2>
          <p className="text-sm text-slate-600 mt-0.5">{t('investmentSub')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('newInvestmentBtn')}</span>
        </button>
      </div>

      {data.investments.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
          {t('noRecords')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {data.investments.map((inv) => (
            <div
              key={inv.id}
              className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span>{inv.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(inv.startDate)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-navy-900 mt-1">
                      {lang === 'bn' ? inv.titleBn : inv.titleEn}
                    </h3>
                  </div>
                  <StatusText status={inv.status} />
                </div>
                {(inv.descriptionEn || inv.descriptionBn) && (
                  <p className="text-sm text-slate-600 mt-2.5">
                    {lang === 'bn' ? inv.descriptionBn || inv.descriptionEn : inv.descriptionEn}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500">{t('investedAmount')}</p>
                    <p className="text-sm font-bold text-navy-900 tabular-nums mt-0.5">
                      {formatCurrency(inv.investedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('expectedReturnRate')}</p>
                    <p className="text-sm font-bold text-gold-600 tabular-nums mt-0.5">
                      {inv.expectedReturnRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('actualReturnAmount')}</p>
                    <p className="text-sm font-bold text-emerald-700 tabular-nums mt-0.5">
                      {formatCurrency(inv.actualReturnAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">
                  {t('maturityDate')}: {inv.maturityDate ? formatDate(inv.maturityDate) : '—'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(inv);
                    setEditStatus(inv.status);
                    setActualReturnAmount(String(inv.actualReturnAmount));
                  }}
                  className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 hover:border-navy-700 text-xs font-semibold text-navy-900 cursor-pointer whitespace-nowrap"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{t('recordReturnBtn')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900 mb-4">{t('newInvestmentBtn')}</h3>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('projectTitleEn')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('projectTitleBn')}
                  </label>
                  <input
                    type="text"
                    value={titleBn}
                    onChange={(e) => setTitleBn(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('category')}
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('investedAmount')} *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={investedAmount}
                    onChange={(e) => setInvestedAmount(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('expectedReturnRate')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={expectedReturnRate}
                    onChange={(e) => setExpectedReturnRate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('startDate')}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('maturityDate')}
                  </label>
                  <input
                    type="date"
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('description')} (EN)
                </label>
                <textarea
                  rows={2}
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('description')} (BN)
                </label>
                <textarea
                  rows={2}
                  value={descriptionBn}
                  onChange={(e) => setDescriptionBn(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-navy-900 text-white text-sm font-semibold cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900 mb-4">{t('recordReturnBtn')}</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('status')}
                </label>
                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as 'active' | 'completed' | 'planned')
                  }
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm bg-white"
                >
                  <option value="active">{t('active')}</option>
                  <option value="completed">{t('completed')}</option>
                  <option value="planned">{t('planned')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('actualReturnAmount')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={actualReturnAmount}
                  onChange={(e) => setActualReturnAmount(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm tabular-nums"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-navy-900 text-white text-sm font-semibold cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminGovernanceView({ data, onReload, onToast }: SubViewProps) {
  const { lang, t, formatDate } = useLanguage();
  const [subTab, setSubTab] = useState<'meetings' | 'polls'>('meetings');
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);

  // Meeting state
  const [mTitleEn, setMTitleEn] = useState('');
  const [mTitleBn, setMTitleBn] = useState('');
  const [mDate, setMDate] = useState(new Date().toISOString().slice(0, 10));
  const [mTime, setMTime] = useState('19:30');
  const [mLocation, setMLocation] = useState('');
  const [mAgendaEn, setMAgendaEn] = useState('');
  const [mAgendaBn, setMAgendaBn] = useState('');

  // Poll state
  const [pQuestionEn, setPQuestionEn] = useState('');
  const [pQuestionBn, setPQuestionBn] = useState('');
  const [pDeadline, setPDeadline] = useState(new Date().toISOString().slice(0, 10));
  const [pOptions, setPOptions] = useState([
    { labelEn: 'Approve', labelBn: 'অনুমোদন' },
    { labelEn: 'Reject', labelBn: 'প্রত্যাখ্যান' },
  ]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/meetings', {
        method: 'POST',
        token: getAdminToken(),
        body: JSON.stringify({
          titleEn: mTitleEn,
          titleBn: mTitleBn,
          date: mDate,
          time: mTime,
          location: mLocation,
          agendaEn: mAgendaEn,
          agendaBn: mAgendaBn,
        }),
      });
      setShowMeetingModal(false);
      setMTitleEn('');
      setMTitleBn('');
      setMLocation('');
      setMAgendaEn('');
      setMAgendaBn('');
      await onReload();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleCompleteMeeting = async (id: string) => {
    try {
      await apiRequest(`/api/admin/meetings/${id}`, {
        method: 'PATCH',
        token: getAdminToken(),
        body: JSON.stringify({ status: 'completed' }),
      });
      await onReload();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/polls', {
        method: 'POST',
        token: getAdminToken(),
        body: JSON.stringify({
          questionEn: pQuestionEn,
          questionBn: pQuestionBn,
          deadline: pDeadline,
          options: pOptions.filter((o) => o.labelEn.trim()),
        }),
      });
      setShowPollModal(false);
      setPQuestionEn('');
      setPQuestionBn('');
      await onReload();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleTogglePoll = async (id: string, nextStatus: 'open' | 'closed') => {
    try {
      await apiRequest(`/api/admin/polls/${id}`, {
        method: 'PATCH',
        token: getAdminToken(),
        body: JSON.stringify({ status: nextStatus }),
      });
      await onReload();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">{t('governanceTitle')}</h2>
          <p className="text-sm text-slate-600 mt-0.5">{t('governanceSub')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMeetingModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-navy-900 text-navy-900 hover:bg-slate-100 text-sm font-semibold cursor-pointer whitespace-nowrap"
          >
            <Calendar className="w-4 h-4" />
            <span>{t('scheduleMeetingBtn')}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowPollModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
          >
            <Vote className="w-4 h-4" />
            <span>{t('createPollBtn')}</span>
          </button>
        </div>
      </div>

      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setSubTab('meetings')}
          className={`min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer whitespace-nowrap ${
            subTab === 'meetings' ? 'bg-white text-navy-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          {t('meetingsTab')}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('polls')}
          className={`min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer whitespace-nowrap ${
            subTab === 'polls' ? 'bg-white text-navy-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          {t('pollsTab')}
        </button>
      </div>

      {subTab === 'meetings' ? (
        <div className="space-y-4">
          {data.meetings.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
              {t('noRecords')}
            </div>
          ) : (
            data.meetings.map((m) => (
              <div key={m.id} className="rounded-xl bg-white border border-slate-200 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                      <span>{formatDate(m.date)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{m.time}</span>
                      <span aria-hidden="true">·</span>
                      <span>{m.location}</span>
                    </div>
                    <h3 className="text-base font-bold text-navy-900 mt-1">
                      {lang === 'bn' ? m.titleBn : m.titleEn}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusText status={m.status} />
                    {m.status === 'upcoming' && (
                      <button
                        type="button"
                        onClick={() => handleCompleteMeeting(m.id)}
                        className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-navy-900 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                      >
                        {t('markCompleted')}
                      </button>
                    )}
                  </div>
                </div>
                {(m.agendaEn || m.agendaBn) && (
                  <p className="text-sm text-slate-600 mt-3">
                    {lang === 'bn' ? m.agendaBn || m.agendaEn : m.agendaEn}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {data.polls.length === 0 ? (
            <div className="rounded-xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
              {t('noRecords')}
            </div>
          ) : (
            data.polls.map((poll) => {
              const total = poll.options.reduce((s, o) => s + o.votes, 0);
              return (
                <div key={poll.id} className="rounded-xl bg-white border border-slate-200 p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <div className="text-xs text-slate-500">
                        {t('deadline')}: {formatDate(poll.deadline)} · {total} {t('totalVotes')}
                      </div>
                      <h3 className="text-base font-bold text-navy-900 mt-1">
                        {lang === 'bn' ? poll.questionBn : poll.questionEn}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusText status={poll.status} />
                      <button
                        type="button"
                        onClick={() =>
                          handleTogglePoll(poll.id, poll.status === 'open' ? 'closed' : 'open')
                        }
                        className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-navy-900 cursor-pointer whitespace-nowrap"
                      >
                        {poll.status === 'open' ? t('closePoll') : t('reopenPoll')}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {poll.options.map((opt) => {
                      const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                      return (
                        <div key={opt.id}>
                          <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                            <span>{lang === 'bn' ? opt.labelBn : opt.labelEn}</span>
                            <span className="tabular-nums">
                              {opt.votes} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-navy-800 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showMeetingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900 mb-4">{t('scheduleMeetingBtn')}</h3>
            <form onSubmit={handleCreateMeeting} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('meetingTitleEn')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={mTitleEn}
                    onChange={(e) => setMTitleEn(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('meetingTitleBn')}
                  </label>
                  <input
                    type="text"
                    value={mTitleBn}
                    onChange={(e) => setMTitleBn(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('date')}
                  </label>
                  <input
                    type="date"
                    required
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('meetingTime')}
                  </label>
                  <input
                    type="time"
                    value={mTime}
                    onChange={(e) => setMTime(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('meetingLocation')}
                </label>
                <input
                  type="text"
                  value={mLocation}
                  onChange={(e) => setMLocation(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('agendaEn')}
                </label>
                <textarea
                  rows={2}
                  value={mAgendaEn}
                  onChange={(e) => setMAgendaEn(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('agendaBn')}
                </label>
                <textarea
                  rows={2}
                  value={mAgendaBn}
                  onChange={(e) => setMAgendaBn(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-navy-900 text-white text-sm font-semibold cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPollModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900 mb-4">{t('createPollBtn')}</h3>
            <form onSubmit={handleCreatePoll} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('pollQuestionEn')} *
                </label>
                <input
                  type="text"
                  required
                  value={pQuestionEn}
                  onChange={(e) => setPQuestionEn(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('pollQuestionBn')}
                </label>
                <input
                  type="text"
                  value={pQuestionBn}
                  onChange={(e) => setPQuestionBn(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('deadline')}
                </label>
                <input
                  type="date"
                  value={pDeadline}
                  onChange={(e) => setPDeadline(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                {pOptions.map((opt, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder={`${t('optionLabelEn')} ${idx + 1}`}
                      value={opt.labelEn}
                      onChange={(e) => {
                        const copy = [...pOptions];
                        copy[idx] = { ...copy[idx], labelEn: e.target.value };
                        setPOptions(copy);
                      }}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                    />
                    <input
                      type="text"
                      placeholder={`${t('optionLabelBn')} ${idx + 1}`}
                      value={opt.labelBn}
                      onChange={(e) => {
                        const copy = [...pOptions];
                        copy[idx] = { ...copy[idx], labelBn: e.target.value };
                        setPOptions(copy);
                      }}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPOptions([...pOptions, { labelEn: '', labelBn: '' }])}
                  className="text-xs font-semibold text-navy-800 hover:underline cursor-pointer"
                >
                  + {t('addOption')}
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPollModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-navy-900 text-white text-sm font-semibold cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminReportsView({ data }: { data: AdminOverviewResponse }) {
  const { t } = useLanguage();

  const cards = [
    {
      id: 'summary' as const,
      title: t('reportSummaryTitle'),
      desc: t('reportSummaryDesc'),
      onPdf: () => exportSummaryPdf(data),
    },
    {
      id: 'members' as const,
      title: t('reportMembersTitle'),
      desc: t('reportMembersDesc'),
      onPdf: () => exportMembersPdf(data),
    },
    {
      id: 'payments' as const,
      title: t('reportPaymentsTitle'),
      desc: t('reportPaymentsDesc'),
      onPdf: () => exportPaymentsPdf(data),
    },
    {
      id: 'ledger' as const,
      title: t('reportLedgerTitle'),
      desc: t('reportLedgerDesc'),
      onPdf: () => exportLedgerPdf(data),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-900">{t('reportsTitle')}</h2>
        <p className="text-sm text-slate-600 mt-0.5">{t('reportsSub')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((card) => (
          <div
            key={card.id}
            className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-base font-bold text-navy-900">{card.title}</h3>
              <p className="text-sm text-slate-600 mt-1.5">{card.desc}</p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={card.onPdf}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap"
              >
                <FileText className="w-4 h-4 text-gold-400" />
                <span>{t('downloadPdf')}</span>
              </button>
              <button
                type="button"
                onClick={() => exportExcelWorkbook(card.id, data)}
                className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 hover:border-navy-700 text-navy-900 text-xs sm:text-sm font-semibold cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>{t('downloadExcel')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSettingsView({
  data,
  onReload,
  onToast,
  onLogout,
}: SubViewProps & { onLogout: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState<SocietySettings>(data.settings);
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/admin/settings', {
        method: 'PUT',
        token: getAdminToken(),
        body: JSON.stringify(form),
      });
      await onReload();
      onToast(t('settingsSaved'));
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Error', true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-navy-900">{t('settingsTitle')}</h2>
        <p className="text-sm text-slate-600 mt-0.5">{t('settingsSub')}</p>
      </div>

      {/* App Language & Sign Out inside Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-[#09328E] shrink-0" />
            <div>
              <div className="text-sm font-bold text-navy-900">{t('languagePreferenceTitle')}</div>
              <div className="text-xs text-slate-500">{t('languageLabel')}</div>
            </div>
          </div>
          <LanguageToggle variant="light" />
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-navy-900">{t('accountLogoutTitle')}</div>
            <div className="text-xs text-slate-500 font-mono truncate">{data.admin.email}</div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('logout')}</span>
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSaveSettings}
        className="rounded-xl bg-white border border-slate-200 p-5 sm:p-6 space-y-6"
      >
        <div>
          <h3 className="text-base font-bold text-navy-900 mb-4">{t('generalRulesHeading')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('societyNameEnLabel')}
              </label>
              <input
                type="text"
                value={form.societyNameEn}
                onChange={(e) => setForm({ ...form, societyNameEn: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('societyNameBnLabel')}
              </label>
              <input
                type="text"
                value={form.societyNameBn}
                onChange={(e) => setForm({ ...form, societyNameBn: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('monthlyDepositLabel')}
              </label>
              <input
                type="number"
                value={form.monthlyDepositAmount}
                onChange={(e) =>
                  setForm({ ...form, monthlyDepositAmount: Number(e.target.value) })
                }
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm tabular-nums"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('lateFineLabel')}
                </label>
                <input
                  type="number"
                  value={form.defaultLateFine}
                  onChange={(e) => setForm({ ...form, defaultLateFine: Number(e.target.value) })}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('graceDayLabel')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={form.graceDayOfMonth}
                  onChange={(e) => setForm({ ...form, graceDayOfMonth: Number(e.target.value) })}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm tabular-nums"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-100">
          <h3 className="text-base font-bold text-navy-900 mb-4">{t('receivingAccountsHeading')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('bkashNumberLabel')}
              </label>
              <input
                type="text"
                value={form.bkashNumber}
                onChange={(e) => setForm({ ...form, bkashNumber: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('bkashTypeLabel')}
              </label>
              <input
                type="text"
                value={form.bkashAccountType}
                onChange={(e) => setForm({ ...form, bkashAccountType: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('nagadNumberLabel')}
              </label>
              <input
                type="text"
                value={form.nagadNumber}
                onChange={(e) => setForm({ ...form, nagadNumber: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('nagadTypeLabel')}
              </label>
              <input
                type="text"
                value={form.nagadAccountType}
                onChange={(e) => setForm({ ...form, nagadAccountType: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('bankNameLabel')}
              </label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('bankAccNameLabel')}
              </label>
              <input
                type="text"
                value={form.bankAccountName}
                onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('bankAccNoLabel')}
              </label>
              <input
                type="text"
                value={form.bankAccountNumber}
                onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('bankBranchLabel')}
                </label>
                <input
                  type="text"
                  value={form.bankBranch}
                  onChange={(e) => setForm({ ...form, bankBranch: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('bankRoutingLabel')}
                </label>
                <input
                  type="text"
                  value={form.bankRoutingNumber}
                  onChange={(e) => setForm({ ...form, bankRoutingNumber: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold cursor-pointer"
          >
            {t('saveSettingsBtn')}
          </button>
        </div>
      </form>

      <div className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-navy-900">{t('securityHeading')}</h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {t('adminRestrictedBadgeNote')}
          </p>
        </div>
        <div className="text-xs sm:text-sm font-mono font-bold text-[#09328E] bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-xl shrink-0">
          {data.admin.email}
        </div>
      </div>
    </div>
  );
}
