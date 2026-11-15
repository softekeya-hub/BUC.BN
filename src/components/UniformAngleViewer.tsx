import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Expand, Eye, ShieldCheck, X } from 'lucide-react';
import { getUniformAnglesForSchool } from '../data/uniformImages';
import type { School, StudentGender, UniformAngle } from '../types/uniform';

interface UniformAngleViewerProps {
  school: School;
  gender: StudentGender;
  activeAngle?: UniformAngle;
  onAngleChange?: (angle: UniformAngle) => void;
  focusItemTitle?: string;
  focusAngleNotes?: {
    front: string;
    side: string;
    back: string;
  };
  compact?: boolean;
  variant?: 'light' | 'dark';
}

const ANGLE_LABELS: Record<UniformAngle, string> = {
  front: 'Front View',
  side: 'Side Profile',
  back: 'Back View',
};

function getGenderDefaultAngleDetails(
  school: School,
  gender: StudentGender,
  angle: UniformAngle
): { caption: string; callouts: string[] } {
  const isPrimary = school.level === 'Primary & Junior School (CBC)';

  if (gender === 'Girls') {
    switch (angle) {
      case 'front':
        return {
          caption: isPrimary
            ? 'Front view: Crisp collared blouse, neat school tie, box-pleated pinafore tunic or skirt, white socks, and buckled leather school shoes.'
            : 'Front view: Crisp collared blouse, woven striped school tie, tailored knit cardigan/pullover, knee-length box-pleated skirt, and buckled shoes.',
          callouts: [
            'Blouse Collar & Tie Alignment',
            isPrimary ? 'Pleated Tunic / Skirt Waist' : 'Box-Pleated Skirt Fall',
            'White Socks & Buckle Shoes',
          ],
        };
      case 'side':
        return {
          caption:
            'Side profile: Uniformly pressed skirt knife-pleats, smooth cardigan sleeve cuff taper, tidy side zip/placket, and cushioned leather shoe sole.',
          callouts: ['Crisp Side Knife-Pleats', 'Sleeve Cuff Finish', 'Leather Shoe Profile'],
        };
      case 'back':
        return {
          caption:
            'Back view: Tailored back blazer/cardigan seams with center vent, folded blouse collar stand, full rear skirt pleats, and knee-high socks.',
          callouts: ['Shoulder Seam & Back Vent', 'Rear Box-Pleat Alignment', 'Reinforced Waistband'],
        };
    }
  }

  switch (angle) {
    case 'front':
      return {
        caption: isPrimary
          ? 'Front view: Collared school shirt, neat tie, V-neck knit pullover, tailored shorts or trousers, ribbed socks, and black leather shoes.'
          : 'Front view: Crisp collared shirt, striped school tie, deep V-neck knit pullover, tailored trousers with belt loops, and lace-up leather shoes.',
        callouts: [
          'Collar Placket & Tie Knot',
          'V-Neck Rib & Crest Placement',
          isPrimary ? 'Tailored Shorts / Trousers' : 'Tailored Trouser Front',
        ],
      };
    case 'side':
      return {
        caption:
          'Side profile: Straight tailored trouser side seam, neat shirt collar contour, ribbed knit armhole/cuff fit, and non-slip leather shoe sole.',
        callouts: ['Straight Trouser Side Seam', 'Collar & Shoulder Fit', 'Non-Slip Shoe Sole'],
      };
    case 'back':
      return {
        caption:
          'Back view: Tailored blazer center back vent, double-pleat shirt yoke, knit hem ribbing, and crisp rear trouser drape with generous hem allowance.',
        callouts: ['Collar Stand & Yoke', 'Tailored Blazer Center Vent', 'Rear Trouser Drape'],
      };
  }
}

export function UniformAngleViewer({
  school,
  gender,
  activeAngle: controlledAngle,
  onAngleChange,
  focusItemTitle,
  focusAngleNotes,
  compact = false,
  variant = 'light',
}: UniformAngleViewerProps) {
  const [internalAngle, setInternalAngle] = useState<UniformAngle>('front');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  const angle = controlledAngle ?? internalAngle;
  const setAngle = (next: UniformAngle) => {
    if (onAngleChange) onAngleChange(next);
    else setInternalAngle(next);
  };

  const angleImages = getUniformAnglesForSchool(school, gender);
  const currentImage = angleImages[angle];
  const genderDetails = getGenderDefaultAngleDetails(school, gender, angle);
  const activeCaption = focusAngleNotes ? focusAngleNotes[angle] : genderDetails.caption;
  const colors = school.colors;

  const isDark = variant === 'dark';

  const bottomFieldLabel =
    gender === 'Girls'
      ? school.level === 'Primary & Junior School (CBC)'
        ? 'Tunic / Skirt'
        : 'Pleated Skirt'
      : school.level === 'Primary & Junior School (CBC)'
        ? 'Shorts / Trousers'
        : 'Trousers';

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 ${
        isDark
          ? 'border border-white/12 bg-white/[0.04]'
          : 'border border-slate-200 bg-[#F8F9FB]'
      }`}
    >
      {/* Angle Switcher Toolbar */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div
          role="tablist"
          aria-label="Uniform viewing angle"
          className={`inline-flex rounded-xl p-1 ${
            isDark
              ? 'border border-white/15 bg-[#07122D]'
              : 'border border-slate-200 bg-white'
          }`}
        >
          {(['front', 'side', 'back'] as UniformAngle[]).map((a) => {
            const active = angle === a;
            return (
              <button
                key={a}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setAngle(a)}
                className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 ${
                  active
                    ? isDark
                      ? 'bg-amber-400 text-[#0B1B42] shadow-xs'
                      : 'bg-[#0B1B42] text-white shadow-xs'
                    : isDark
                      ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {ANGLE_LABELS[a]}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            isDark
              ? 'border border-white/15 bg-white/10 text-white hover:bg-white/20'
              : 'border border-slate-200 bg-white text-slate-700 hover:border-[#0B1B42] hover:text-[#0B1B42]'
          }`}
        >
          <Expand className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Zoom / Lightbox</span>
        </button>
      </div>

      {/* Preview Stage (object-contain prevents clipping collar or shoes) */}
      <div
        className={`overflow-hidden rounded-xl ${
          isDark ? 'border border-white/15' : 'border border-slate-200/90'
        } studio-backdrop`}
      >
        <div className={`relative w-full ${compact ? 'aspect-[4/3]' : 'aspect-[4/3]'}`}>
          <AnimatePresence mode="wait">
            {!imgError[`${school.id}-${gender}-${angle}`] ? (
              <motion.img
                key={`${school.id}-${gender}-${angle}`}
                src={currentImage}
                alt={`${school.name} ${gender} uniform — ${ANGLE_LABELS[angle]}`}
                referrerPolicy="no-referrer"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.985 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                onError={() =>
                  setImgError((prev) => ({
                    ...prev,
                    [`${school.id}-${gender}-${angle}`]: true,
                  }))
                }
                onClick={() => setLightboxOpen(true)}
                className="h-full w-full cursor-zoom-in object-contain"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6 text-center">
                <Eye className="mb-2 h-8 w-8 text-[#0B1B42]" />
                <p className="font-display text-sm font-semibold text-slate-900">
                  {school.name} · {gender} Kit · {ANGLE_LABELS[angle]}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Clean footer strip directly below image so garment & shoes are never obscured */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-300/60 bg-[#07122D] px-4 py-2.5 text-white">
          <div className="text-xs font-medium">
            <span className="text-amber-300">{ANGLE_LABELS[angle]}</span>
            <span aria-hidden="true"> · </span>
            <span>{focusItemTitle || `${school.name} (${gender} Kit)`}</span>
          </div>
          <div className="flex items-center gap-1.5" aria-label="Official school garment swatches">
            <span
              title={`Top: ${colors.shirtName}`}
              className="h-3.5 w-3.5 rounded-full border border-white/75"
              style={{ backgroundColor: colors.shirtHex }}
            />
            <span
              title={`Knitwear: ${colors.knitName}`}
              className="h-3.5 w-3.5 rounded-full border border-white/75"
              style={{ backgroundColor: colors.knitHex }}
            />
            <span
              title={`Bottom: ${colors.bottomName}`}
              className="h-3.5 w-3.5 rounded-full border border-white/75"
              style={{ backgroundColor: colors.bottomHex }}
            />
            <span
              title="Tie Accent"
              className="h-3.5 w-3.5 rounded-full border border-white/75"
              style={{ backgroundColor: colors.tieAccentHex }}
            />
          </div>
        </div>
      </div>

      {/* Angle Tailoring Notes & Unboxed Swatch Spec Breakdown */}
      <div className="mt-4 space-y-3">
        <p
          className={`text-xs leading-relaxed sm:text-[13px] ${
            isDark ? 'text-slate-200' : 'text-slate-700'
          }`}
        >
          {activeCaption}
        </p>

        <div
          className={`grid grid-cols-3 divide-x text-xs ${
            isDark
              ? 'divide-white/12 border-y border-white/12 py-2.5'
              : 'divide-slate-200 border-y border-slate-200 py-2.5'
          }`}
        >
          <div className="pr-3">
            <span
              className={`block text-[11px] ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {gender === 'Girls' ? 'Blouse' : 'Shirt'}
            </span>
            <span
              className={`mt-0.5 flex items-center gap-1.5 font-medium ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/40"
                style={{ backgroundColor: colors.shirtHex }}
              />
              <span className="truncate">{colors.shirtName}</span>
            </span>
          </div>

          <div className="px-3">
            <span
              className={`block text-[11px] ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Knitwear
            </span>
            <span
              className={`mt-0.5 flex items-center gap-1.5 font-medium ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/40"
                style={{ backgroundColor: colors.knitHex }}
              />
              <span className="truncate">{colors.knitName}</span>
            </span>
          </div>

          <div className="pl-3">
            <span
              className={`block text-[11px] ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {bottomFieldLabel}
            </span>
            <span
              className={`mt-0.5 flex items-center gap-1.5 font-medium ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/40"
                style={{ backgroundColor: colors.bottomHex }}
              />
              <span className="truncate">{colors.bottomName}</span>
            </span>
          </div>
        </div>

        {/* Subtle Verification Notice */}
        <p
          className={`flex items-start gap-2 text-[11px] leading-snug ${
            isDark ? 'text-amber-200/90' : 'text-amber-900'
          }`}
        >
          <ShieldCheck
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
              isDark ? 'text-amber-300' : 'text-amber-600'
            }`}
            aria-hidden="true"
          />
          <span>
            Colours &amp; specs verified against school guidelines — confirm final shade at Banana Hill store.
          </span>
        </p>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${school.name} 3-Angle Uniform Lightbox`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-xs"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  {school.name} — {gender} Kit ({ANGLE_LABELS[angle]})
                </h3>
                <p className="text-xs text-slate-500">
                  {focusItemTitle || colors.primaryName} · Tailoring &amp; seam inspection
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                aria-label="Close lightbox"
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-[#F6F7F9] p-4 sm:p-5">
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                  {(['front', 'side', 'back'] as UniformAngle[]).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAngle(a)}
                      className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        angle === a
                          ? 'bg-[#0B1B42] text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {ANGLE_LABELS[a]}
                    </button>
                  ))}
                </div>
                <span className="hidden text-xs text-slate-500 sm:inline">
                  {genderDetails.callouts.join(' · ')}
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 studio-backdrop">
                <img
                  src={currentImage}
                  alt={`${school.name} ${gender} ${ANGLE_LABELS[angle]} zoomed inspection`}
                  referrerPolicy="no-referrer"
                  className="max-h-[60vh] w-full object-contain"
                />
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-700">{activeCaption}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
