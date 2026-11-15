import { useMemo, useState } from 'react';
import { Ruler, Sparkles, X } from 'lucide-react';
import { BOTTOM_SIZES, GARMENT_SIZES, SHOE_SIZES } from '../data/schools';

interface SizeGuideModalProps {
  open: boolean;
  onClose: () => void;
  onApplyRecommendation?: (rec: {
    garmentSize: string;
    bottomSize: string;
    shoeSize: string;
    onesize: string;
  }) => void;
}

interface SizeRow {
  ageRange: string;
  minAge: number;
  maxAge: number;
  heightCm: string;
  chestIn: string;
  waistIn: string;
  garmentIdx: number;
  bottomIdx: number;
  shoeIdx: number;
  onesize: string;
}

const SIZE_CHART: SizeRow[] = [
  { ageRange: '4–5 yrs', minAge: 4, maxAge: 5, heightCm: '104–112 cm', chestIn: '22"', waistIn: '21–22"', garmentIdx: 0, bottomIdx: 0, shoeIdx: 0, onesize: 'Junior (Age 4–10)' },
  { ageRange: '6–7 yrs', minAge: 6, maxAge: 7, heightCm: '115–124 cm', chestIn: '24–26"', waistIn: '23–24"', garmentIdx: 1, bottomIdx: 1, shoeIdx: 2, onesize: 'Junior (Age 4–10)' },
  { ageRange: '8–9 yrs', minAge: 8, maxAge: 9, heightCm: '126–135 cm', chestIn: '26–28"', waistIn: '25–26"', garmentIdx: 2, bottomIdx: 2, shoeIdx: 4, onesize: 'Junior (Age 4–10)' },
  { ageRange: '10–11 yrs', minAge: 10, maxAge: 11, heightCm: '138–146 cm', chestIn: '28–30"', waistIn: '27–28"', garmentIdx: 3, bottomIdx: 3, shoeIdx: 6, onesize: 'Intermediate (Age 11–14)' },
  { ageRange: '12–13 yrs', minAge: 12, maxAge: 13, heightCm: '148–157 cm', chestIn: '30–32"', waistIn: '28–30"', garmentIdx: 5, bottomIdx: 4, shoeIdx: 8, onesize: 'Intermediate (Age 11–14)' },
  { ageRange: '14–15 yrs', minAge: 14, maxAge: 15, heightCm: '158–167 cm', chestIn: '34–36"', waistIn: '30–32"', garmentIdx: 7, bottomIdx: 5, shoeIdx: 10, onesize: 'Senior (Age 15–18)' },
  { ageRange: '16–17 yrs', minAge: 16, maxAge: 17, heightCm: '168–176 cm', chestIn: '38–40"', waistIn: '32–34"', garmentIdx: 9, bottomIdx: 6, shoeIdx: 12, onesize: 'Senior (Age 15–18)' },
  { ageRange: '17–18+ yrs', minAge: 18, maxAge: 19, heightCm: '175–184 cm', chestIn: '42–44"', waistIn: '36–38"', garmentIdx: 10, bottomIdx: 7, shoeIdx: 14, onesize: 'Senior (Age 15–18)' },
];

export function SizeGuideModal({
  open,
  onClose,
  onApplyRecommendation,
}: SizeGuideModalProps) {
  const [age, setAge] = useState<number>(13);
  const [heightCm, setHeightCm] = useState<number>(154);
  const [waistIn, setWaistIn] = useState<number>(29);
  const [footEuro, setFootEuro] = useState<number>(36);
  const [growthRoom, setGrowthRoom] = useState<boolean>(true);

  const recommendation = useMemo(() => {
    const baseIndex = SIZE_CHART.findIndex((row) => age >= row.minAge && age <= row.maxAge);
    const heightBump = heightCm >= 170 ? 1 : 0;
    const rowIdx = Math.min(SIZE_CHART.length - 1, Math.max(0, (baseIndex === -1 ? 4 : baseIndex) + heightBump));
    const row = SIZE_CHART[rowIdx];

    const step = growthRoom ? 1 : 0;
    const garmentIdx = Math.min(GARMENT_SIZES.length - 1, row.garmentIdx + step);

    // Factor waist input directly so wide/slim builds get accurate trousers/skirt size
    const waistEstimatedIdx = Math.max(0, Math.min(BOTTOM_SIZES.length - 1, Math.round((waistIn - 22) / 2)));
    const bottomIdx = Math.min(BOTTOM_SIZES.length - 1, Math.max(row.bottomIdx, waistEstimatedIdx) + step);

    const shoeBaseIdx = Math.max(0, Math.min(SHOE_SIZES.length - 1, footEuro - 28));
    const shoeIdx = Math.min(SHOE_SIZES.length - 1, shoeBaseIdx + (growthRoom ? 1 : 0));

    return {
      garmentSize: GARMENT_SIZES[garmentIdx],
      bottomSize: BOTTOM_SIZES[bottomIdx],
      shoeSize: SHOE_SIZES[shoeIdx],
      onesize: row.onesize,
      chestEstimate: row.chestIn,
    };
  }, [age, heightCm, waistIn, footEuro, growthRoom]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Interactive Size Guide and Growth Room Helper"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B1B42] text-amber-400">
              <Ruler className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Kenyan Uniform Size Guide &amp; Room to Grow Helper
              </h2>
              <p className="text-xs text-slate-500">
                Convert Age, Height, Chest/Waist &amp; Shoe Size into verified Banana Uniform Centre sizes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          {/* Interactive Fit Toggle */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">Fit Preference</p>
              <p className="text-xs text-slate-600">
                {growthRoom
                  ? 'Adds 1 size bracket for 2–3 terms of growth (recommended for Term 1 buyers).'
                  : 'Exact current-term tailored fit with standard 1-inch hem allowance.'}
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shrink-0">
              <button
                type="button"
                onClick={() => setGrowthRoom(false)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  !growthRoom ? 'bg-[#0B1B42] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Standard Fit
              </button>
              <button
                type="button"
                onClick={() => setGrowthRoom(true)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  growthRoom ? 'bg-amber-400 text-[#0B1B42]' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                One Size Up (Growth Room)
              </button>
            </div>
          </div>

          {/* Sliders / Inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block rounded-xl border border-slate-200 p-3.5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Student Age</span>
                <span className="font-mono font-semibold text-blue-900 tabular-nums">{age} yrs</span>
              </div>
              <input
                type="range"
                min={4}
                max={18}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full accent-blue-900"
              />
            </label>

            <label className="block rounded-xl border border-slate-200 p-3.5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Height (cm)</span>
                <span className="font-mono font-semibold text-blue-900 tabular-nums">{heightCm} cm</span>
              </div>
              <input
                type="range"
                min={100}
                max={186}
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full accent-blue-900"
              />
            </label>

            <label className="block rounded-xl border border-slate-200 p-3.5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Waist Measurement (inches)</span>
                <span className="font-mono font-semibold text-blue-900 tabular-nums">{waistIn}&quot;</span>
              </div>
              <input
                type="range"
                min={20}
                max={38}
                value={waistIn}
                onChange={(e) => setWaistIn(Number(e.target.value))}
                className="w-full accent-blue-900"
              />
            </label>

            <label className="block rounded-xl border border-slate-200 p-3.5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-700">
                <span>Current Shoe Size (EU / KE)</span>
                <span className="font-mono font-semibold text-blue-900 tabular-nums">Size {footEuro}</span>
              </div>
              <input
                type="range"
                min={28}
                max={43}
                value={footEuro}
                onChange={(e) => setFootEuro(Number(e.target.value))}
                className="w-full accent-blue-900"
              />
            </label>
          </div>

          {/* Recommended Output */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-blue-950">
                Recommended Sizes ({growthRoom ? 'With Growth Room' : 'Standard Tailored Fit'})
              </h3>
              <span className="text-xs font-medium text-blue-800">
                Est. Chest {recommendation.chestEstimate} · {recommendation.onesize}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-white p-3 border border-blue-100">
                <span className="block text-[11px] text-slate-500">Shirts / Blouses / Sweaters</span>
                <span className="mt-0.5 block font-mono text-sm font-semibold text-slate-900">
                  {recommendation.garmentSize}
                </span>
              </div>
              <div className="rounded-lg bg-white p-3 border border-blue-100">
                <span className="block text-[11px] text-slate-500">Trousers / Skirts / Tunics</span>
                <span className="mt-0.5 block font-mono text-sm font-semibold text-slate-900">
                  {recommendation.bottomSize}
                </span>
              </div>
              <div className="rounded-lg bg-white p-3 border border-blue-100">
                <span className="block text-[11px] text-slate-500">School Leather Shoes</span>
                <span className="mt-0.5 block font-mono text-sm font-semibold text-slate-900">
                  {recommendation.shoeSize}
                </span>
              </div>
            </div>

            {onApplyRecommendation && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onApplyRecommendation(recommendation);
                    onClose();
                  }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#0B1B42] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#162C63]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  <span>Apply These Sizes to Active Kit</span>
                </button>
              </div>
            )}
          </div>

          {/* Reference Conversion Table */}
          <div>
            <h3 className="mb-2.5 font-display text-sm font-bold text-slate-900">
              Kenya School Uniform Size Conversion Chart
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Age</th>
                    <th className="px-3 py-2.5 font-semibold">Height</th>
                    <th className="px-3 py-2.5 font-semibold">Chest</th>
                    <th className="px-3 py-2.5 font-semibold">Waist</th>
                    <th className="px-3 py-2.5 font-semibold">Top / Knit Size</th>
                    <th className="px-3 py-2.5 font-semibold">Shoe Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums text-slate-700">
                  {SIZE_CHART.map((row) => (
                    <tr key={row.ageRange} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-sans font-medium text-slate-900">{row.ageRange}</td>
                      <td className="px-3 py-2">{row.heightCm}</td>
                      <td className="px-3 py-2">{row.chestIn}</td>
                      <td className="px-3 py-2">{row.waistIn}</td>
                      <td className="px-3 py-2">{GARMENT_SIZES[row.garmentIdx].split(' ')[1]}</td>
                      <td className="px-3 py-2">{28 + row.shoeIdx}–{29 + row.shoeIdx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
