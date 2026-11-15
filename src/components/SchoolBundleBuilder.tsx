import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, Ruler, ShoppingBag, X } from 'lucide-react';
import {
  formatKes,
  getDefaultSizeForSchool,
  getSizeOptions,
} from '../data/schools';
import { getUniformAnglesForSchool } from '../data/uniformImages';
import type {
  CartItem,
  School,
  StudentGender,
  UniformAngle,
  UniformItem,
} from '../types/uniform';
import { UniformAngleViewer } from './UniformAngleViewer';

interface LineConfig {
  included: boolean;
  size: string;
  quantity: number;
}

interface SchoolBundleBuilderProps {
  school: School | null;
  initialGender?: StudentGender;
  sizeGuideApplyPayload?: {
    garmentSize: string;
    bottomSize: string;
    shoeSize: string;
    onesize: string;
    appliedAt: number;
  } | null;
  onClose: () => void;
  onAddKitToCart: (items: CartItem[]) => void;
  onOpenSizeGuide: () => void;
}

export function SchoolBundleBuilder({
  school,
  initialGender,
  sizeGuideApplyPayload,
  onClose,
  onAddKitToCart,
  onOpenSizeGuide,
}: SchoolBundleBuilderProps) {
  const defaultGender: StudentGender = useMemo(() => {
    if (!school) return 'Boys';
    if (school.genderType === 'Boys') return 'Boys';
    if (school.genderType === 'Girls') return 'Girls';
    return initialGender || 'Boys';
  }, [school, initialGender]);

  const [gender, setGender] = useState<StudentGender>(defaultGender);
  const [lineState, setLineState] = useState<Record<string, LineConfig>>({});
  const [activeAngle, setActiveAngle] = useState<UniformAngle>('front');
  const [focusedItem, setFocusedItem] = useState<UniformItem | null>(null);

  useEffect(() => {
    if (!school) return;
    const nextGender: StudentGender =
      school.genderType === 'Boys'
        ? 'Boys'
        : school.genderType === 'Girls'
          ? 'Girls'
          : initialGender || 'Boys';
    setGender(nextGender);
    setFocusedItem(null);
    setActiveAngle('front');

    const map: Record<string, LineConfig> = {};
    for (const g of ['Boys', 'Girls'] as StudentGender[]) {
      const list = g === 'Boys' ? school.boysKit : school.girlsKit;
      for (const it of list) {
        let defaultSize = getDefaultSizeForSchool(it.sizeType, school.level);
        if (sizeGuideApplyPayload) {
          if (it.sizeType === 'garment') defaultSize = sizeGuideApplyPayload.garmentSize;
          else if (it.sizeType === 'bottom') defaultSize = sizeGuideApplyPayload.bottomSize;
          else if (it.sizeType === 'shoe') defaultSize = sizeGuideApplyPayload.shoeSize;
          else if (it.sizeType === 'onesize') defaultSize = sizeGuideApplyPayload.onesize;
        }
        map[`${g}:${it.id}`] = {
          included: it.defaultInclude,
          size: defaultSize,
          quantity: 1,
        };
      }
    }
    setLineState(map);
  }, [school, initialGender]);

  useEffect(() => {
    if (!school || !sizeGuideApplyPayload) return;
    setLineState((prev) => {
      const next = { ...prev };
      for (const g of ['Boys', 'Girls'] as StudentGender[]) {
        const list = g === 'Boys' ? school.boysKit : school.girlsKit;
        for (const it of list) {
          const k = `${g}:${it.id}`;
          const existing = next[k];
          if (!existing) continue;
          let recommendedSize = existing.size;
          if (it.sizeType === 'garment') recommendedSize = sizeGuideApplyPayload.garmentSize;
          else if (it.sizeType === 'bottom') recommendedSize = sizeGuideApplyPayload.bottomSize;
          else if (it.sizeType === 'shoe') recommendedSize = sizeGuideApplyPayload.shoeSize;
          else if (it.sizeType === 'onesize') recommendedSize = sizeGuideApplyPayload.onesize;
          next[k] = { ...existing, size: recommendedSize };
        }
      }
      return next;
    });
  }, [sizeGuideApplyPayload, school]);

  if (!school) return null;

  const activeKit = gender === 'Boys' ? school.boysKit : school.girlsKit;
  const angleThumbs = getUniformAnglesForSchool(school, gender);

  const bundleSummary = activeKit.reduce(
    (acc, it) => {
      const cfg = lineState[`${gender}:${it.id}`];
      if (!cfg?.included) return acc;
      acc.itemCount += cfg.quantity;
      acc.totalKes += it.priceKes * cfg.quantity;
      return acc;
    },
    { itemCount: 0, totalKes: 0 }
  );

  const toggleInclude = (itemId: string) => {
    const key = `${gender}:${itemId}`;
    setLineState((prev) => ({
      ...prev,
      [key]: { ...prev[key], included: !prev[key]?.included },
    }));
  };

  const updateSize = (itemId: string, size: string) => {
    const key = `${gender}:${itemId}`;
    setLineState((prev) => ({
      ...prev,
      [key]: { ...prev[key], size },
    }));
  };

  const updateQty = (itemId: string, delta: number) => {
    const key = `${gender}:${itemId}`;
    setLineState((prev) => {
      const current = prev[key]?.quantity ?? 1;
      const nextQty = Math.max(1, Math.min(10, current + delta));
      return {
        ...prev,
        [key]: { ...prev[key], quantity: nextQty },
      };
    });
  };

  const handleAddBundle = () => {
    const cartItems: CartItem[] = [];
    for (const it of activeKit) {
      const cfg = lineState[`${gender}:${it.id}`];
      if (!cfg?.included) continue;
      cartItems.push({
        key: `${school.id}::${gender}::${it.id}::${cfg.size}`,
        schoolId: school.id,
        schoolName: school.name,
        gender,
        itemId: it.id,
        itemName: it.name,
        category: it.category,
        size: cfg.size,
        quantity: cfg.quantity,
        unitPriceKes: it.priceKes,
        angleNotes: it.angleNotes,
      });
    }
    if (cartItems.length > 0) {
      onAddKitToCart(cartItems);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${school.name} Uniform Bundle Builder`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-6">
          <div>
            <p className="text-xs font-medium text-slate-500">
              {school.location} <span aria-hidden="true">·</span> {school.level}{' '}
              <span aria-hidden="true">·</span> {school.genderType} School
            </p>
            <h2 className="font-display text-lg font-semibold text-slate-900 sm:text-xl">
              {school.name} — Uniform Bundle Builder
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSizeGuide}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-900 hover:text-blue-900 whitespace-nowrap"
            >
              <Ruler className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              <span>Size Guide</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close bundle builder"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Boys / Girls Toggle Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#F7F8FA] px-4 py-3 sm:px-6">
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {school.genderType !== 'Girls' && (
              <button
                type="button"
                onClick={() => {
                  setGender('Boys');
                  setFocusedItem(null);
                }}
                className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap sm:text-sm ${
                  gender === 'Boys'
                    ? 'bg-[#0B1B42] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Boys Uniform Kit
              </button>
            )}
            {school.genderType !== 'Boys' && (
              <button
                type="button"
                onClick={() => {
                  setGender('Girls');
                  setFocusedItem(null);
                }}
                className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap sm:text-sm ${
                  gender === 'Girls'
                    ? 'bg-[#0B1B42] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Girls Uniform Kit
              </button>
            )}
          </div>

          <p className="text-xs text-slate-600">
            Tick items needed, choose sizes, and click{' '}
            <strong className="font-semibold text-slate-900">Add Complete Kit to Cart</strong>.
          </p>
        </div>

        {/* Main Scrollable Split Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column: 3-Angle Uniform Viewer */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-0">
                <UniformAngleViewer
                  school={school}
                  gender={gender}
                  activeAngle={activeAngle}
                  onAngleChange={setActiveAngle}
                  focusItemTitle={focusedItem?.name}
                  focusAngleNotes={focusedItem?.angleNotes}
                  compact
                />
              </div>
            </div>

            {/* Right Column: Interactive Kit Checklist */}
            <div className="space-y-3 lg:col-span-7">
              {activeKit.map((it) => {
                const cfg = lineState[`${gender}:${it.id}`] || {
                  included: it.defaultInclude,
                  size: getDefaultSizeForSchool(it.sizeType, school.level),
                  quantity: 1,
                };
                const sizeOptions = getSizeOptions(it.sizeType);
                const lineTotal = it.priceKes * cfg.quantity;
                const isFocused = focusedItem?.id === it.id;

                return (
                  <div
                    key={`${gender}-${it.id}`}
                    className={`rounded-xl border p-3.5 transition-colors sm:p-4 ${
                      cfg.included
                        ? isFocused
                          ? 'border-blue-900 bg-blue-50/30'
                          : 'border-slate-200 bg-white'
                        : 'border-slate-200 bg-slate-50/70 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Checkbox + Gender-Accurate 3-Angle Thumbnail + Title */}
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={cfg.included}
                          aria-label={`Include ${it.name} in bundle`}
                          onClick={() => toggleInclude(it.id)}
                          className={`mt-1 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                            cfg.included
                              ? 'border-blue-900 bg-blue-900 text-white'
                              : 'border-slate-300 bg-white text-transparent hover:border-blue-900'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFocusedItem(it);
                            setActiveAngle((prev) =>
                              prev === 'front' ? 'side' : prev === 'side' ? 'back' : 'front'
                            );
                          }}
                          title="Inspect Front, Side & Back angle"
                          className="group relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-[#E5E7EB]"
                        >
                          <img
                            src={angleThumbs[activeAngle]}
                            alt={`${it.name} ${gender} ${activeAngle} preview`}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-contain transition-transform group-hover:scale-105"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-slate-900/75 py-0.5 text-center text-[9px] font-medium text-white">
                            3-View
                          </span>
                        </button>

                        <div>
                          <button
                            type="button"
                            onClick={() => setFocusedItem(it)}
                            className="cursor-pointer text-left font-display text-sm font-bold text-slate-900 hover:text-blue-900"
                          >
                            {it.name}
                          </button>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {it.category} <span aria-hidden="true">·</span>{' '}
                            <span className="font-mono font-medium text-slate-700 tabular-nums">
                              {formatKes(it.priceKes)}
                            </span>{' '}
                            each
                            {it.note ? ` · ${it.note}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Controls: Size Dropdown + Stepper + Line Price */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pl-8 sm:justify-end sm:pl-0">
                        <select
                          aria-label={`Select size for ${it.name}`}
                          value={cfg.size}
                          disabled={!cfg.included}
                          onChange={(e) => updateSize(it.id, e.target.value)}
                          className="min-h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-900 focus:outline-none disabled:bg-slate-100"
                        >
                          {sizeOptions.map((sz) => (
                            <option key={sz} value={sz}>
                              {sz}
                            </option>
                          ))}
                        </select>

                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                          <button
                            type="button"
                            disabled={!cfg.included || cfg.quantity <= 1}
                            onClick={() => updateQty(it.id, -1)}
                            aria-label={`Decrease quantity of ${it.name}`}
                            className="flex h-9 w-8 cursor-pointer items-center justify-center text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono text-xs font-semibold text-slate-900 tabular-nums">
                            {cfg.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={!cfg.included || cfg.quantity >= 10}
                            onClick={() => updateQty(it.id, 1)}
                            aria-label={`Increase quantity of ${it.name}`}
                            className="flex h-9 w-8 cursor-pointer items-center justify-center text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="min-w-[84px] text-right font-mono text-sm font-bold text-slate-900 tabular-nums">
                          {cfg.included ? formatKes(lineTotal) : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Bottom Bundle Summary Bar */}
        <div className="border-t border-slate-800 bg-[#0B1B42] px-4 py-3.5 text-white sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs text-slate-300">
                {school.name} <span aria-hidden="true">·</span> {gender} Kit ({bundleSummary.itemCount}{' '}
                {bundleSummary.itemCount === 1 ? 'item' : 'items'} selected)
              </p>
              <p className="font-mono text-xl font-semibold text-amber-300 tabular-nums">
                {formatKes(bundleSummary.totalKes)}
              </p>
            </div>

            <button
              type="button"
              disabled={bundleSummary.itemCount === 0}
              onClick={handleAddBundle}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-[#0B1B42] transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              <span>Add Complete Kit to Cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
