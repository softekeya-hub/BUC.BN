import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  MapPin,
  Ruler,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import heroStudentsImg from './assets/images/hero_kenyan_students_uniform_1794777524087.jpg';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { Header } from './components/Header';
import { SchoolBundleBuilder } from './components/SchoolBundleBuilder';
import { SizeGuideModal } from './components/SizeGuideModal';
import { StoreShowcaseSection } from './components/StoreShowcaseSection';
import { TransactionsModal } from './components/TransactionsModal';
import { UniformAngleViewer } from './components/UniformAngleViewer';
import { formatKes, SCHOOLS } from './data/schools';
import { DEPARTMENT_IMAGES, getUniformStudioImage } from './data/uniformImages';
import { auth } from './lib/firebase';
import type { CartItem, School, StudentGender } from './types/uniform';

type FilterPill =
  | 'All Schools'
  | 'Boys Kits'
  | 'Girls Kits'
  | 'Primary & Junior School (CBC)'
  | 'Senior / High Schools'
  | 'Banana Hill & Ruaka'
  | 'Muchatha & Ndenderu'
  | 'Kiambaa & Limuru Rd';

const FILTER_PILLS: FilterPill[] = [
  'All Schools',
  'Boys Kits',
  'Girls Kits',
  'Primary & Junior School (CBC)',
  'Senior / High Schools',
  'Banana Hill & Ruaka',
  'Muchatha & Ndenderu',
  'Kiambaa & Limuru Rd',
];

const CART_STORAGE_KEY = 'buc_cart_v1';
const INITIAL_VISIBLE_KITS = 9;

interface GenderUniformCardEntry {
  key: string;
  school: School;
  gender: StudentGender;
  image: string;
  itemsSummary: string;
  itemCount: number;
  kitTotalKes: number;
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterPill>('All Schools');
  const [genderTab, setGenderTab] = useState<'all' | 'Boys' | 'Girls'>('all');
  const [showAllKits, setShowAllKits] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [selectedGender, setSelectedGender] = useState<StudentGender | undefined>(undefined);
  const [spotlightSchool, setSpotlightSchool] = useState<School>(SCHOOLS[0]);
  const [spotlightGender, setSpotlightGender] = useState<StudentGender>('Boys');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [sizeGuideApplyPayload, setSizeGuideApplyPayload] = useState<{
    garmentSize: string;
    bottomSize: string;
    shoeSize: string;
    onesize: string;
    appliedAt: number;
  } | null>(null);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota
    }
  }, [cart]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectFilter = (pill: FilterPill) => {
    setActiveFilter(pill);
    if (pill === 'Boys Kits') setGenderTab('Boys');
    else if (pill === 'Girls Kits') setGenderTab('Girls');
    else if (pill === 'All Schools') setGenderTab('all');
  };

  const predictiveResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SCHOOLS.slice(0, 6);
    return SCHOOLS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.regionTag.toLowerCase().includes(q) ||
        s.colors.primaryName.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  const filteredSchools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SCHOOLS.filter((s) => {
      if (q) {
        const matchesText =
          s.name.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.regionTag.toLowerCase().includes(q) ||
          s.level.toLowerCase().includes(q) ||
          s.colors.primaryName.toLowerCase().includes(q);
        if (!matchesText) return false;
      }

      switch (activeFilter) {
        case 'All Schools':
          return true;
        case 'Boys Kits':
          return s.boysKit.length > 0;
        case 'Girls Kits':
          return s.girlsKit.length > 0;
        case 'Primary & Junior School (CBC)':
          return s.level === 'Primary & Junior School (CBC)';
        case 'Senior / High Schools':
          return s.level === 'Senior / High Schools';
        case 'Banana Hill & Ruaka':
          return s.regionTag === 'Banana Hill & Ruaka';
        case 'Muchatha & Ndenderu':
          return s.regionTag === 'Muchatha & Ndenderu';
        case 'Kiambaa & Limuru Rd':
          return s.regionTag === 'Kiambaa & Limuru Rd';
      }
    });
  }, [searchQuery, activeFilter]);

  const uniformCards = useMemo<GenderUniformCardEntry[]>(() => {
    const entries: GenderUniformCardEntry[] = [];
    for (const school of filteredSchools) {
      const showBoys =
        school.boysKit.length > 0 &&
        (genderTab === 'all' || genderTab === 'Boys') &&
        activeFilter !== 'Girls Kits';
      const showGirls =
        school.girlsKit.length > 0 &&
        (genderTab === 'all' || genderTab === 'Girls') &&
        activeFilter !== 'Boys Kits';

      if (showGirls) {
        const defaultItems = school.girlsKit.filter((i) => i.defaultInclude);
        entries.push({
          key: `${school.id}-girls`,
          school,
          gender: 'Girls',
          image: getUniformStudioImage(school, 'Girls'),
          itemsSummary: school.girlsKit
            .slice(0, 4)
            .map((i) => i.name)
            .join(', '),
          itemCount: school.girlsKit.length,
          kitTotalKes: defaultItems.reduce((sum, i) => sum + i.priceKes, 0),
        });
      }

      if (showBoys) {
        const defaultItems = school.boysKit.filter((i) => i.defaultInclude);
        entries.push({
          key: `${school.id}-boys`,
          school,
          gender: 'Boys',
          image: getUniformStudioImage(school, 'Boys'),
          itemsSummary: school.boysKit
            .slice(0, 4)
            .map((i) => i.name)
            .join(', '),
          itemCount: school.boysKit.length,
          kitTotalKes: defaultItems.reduce((sum, i) => sum + i.priceKes, 0),
        });
      }
    }
    return entries;
  }, [filteredSchools, genderTab, activeFilter]);

  const isFilteredView =
    Boolean(searchQuery.trim()) || activeFilter !== 'All Schools' || genderTab !== 'all';

  const visibleUniformCards =
    isFilteredView || showAllKits ? uniformCards : uniformCards.slice(0, INITIAL_VISIBLE_KITS);

  const cartCount = cart.reduce((sum, it) => sum + it.quantity, 0);
  const cartTotalKes = cart.reduce((sum, it) => sum + it.unitPriceKes * it.quantity, 0);

  const openSchoolKit = (school: School, preferredGender?: StudentGender) => {
    const g: StudentGender =
      preferredGender ||
      (school.genderType === 'Girls'
        ? 'Girls'
        : school.genderType === 'Boys'
          ? 'Boys'
          : genderTab === 'Girls' || activeFilter === 'Girls Kits'
            ? 'Girls'
            : 'Boys');
    setSpotlightSchool(school);
    setSpotlightGender(g);
    setSelectedGender(g);
    setSelectedSchool(school);
    setSearchFocused(false);
  };

  const handleAddKitToCart = (incomingItems: CartItem[]) => {
    setCart((prev) => {
      const map = new Map(prev.map((item) => [item.key, { ...item }]));
      for (const nextItem of incomingItems) {
        const existing = map.get(nextItem.key);
        if (existing) {
          existing.quantity = Math.min(20, existing.quantity + nextItem.quantity);
        } else {
          map.set(nextItem.key, { ...nextItem });
        }
      }
      return Array.from(map.values());
    });
    const kitSchool = incomingItems[0]?.schoolName || 'Uniform';
    const kitGender = incomingItems[0]?.gender || '';
    setSelectedSchool(null);
    setToastMsg(`Added ${kitSchool} (${kitGender} Kit) to your bag.`);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const handleUpdateCartQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => (it.key === key ? { ...it, quantity: it.quantity + delta } : it))
        .filter((it) => it.quantity > 0)
    );
  };

  const handleRemoveCartItem = (key: string) => {
    setCart((prev) => prev.filter((it) => it.key !== key));
  };

  return (
    <div id="top" className="min-h-screen bg-white text-slate-900">
      <Header
        cartCount={cartCount}
        cartTotalKes={cartTotalKes}
        onOpenCart={() => setCartOpen(true)}
        onOpenSizeGuide={() => setSizeGuideOpen(true)}
        onOpenLedger={() => setLedgerOpen(true)}
      />

      <main>
        {/* 1. Editorial Split Hero & Instant School Finder */}
        <section className="border-b border-slate-200 bg-white pt-8 pb-12 sm:pt-12 sm:pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left: Editorial Copy, Predictive Search & Filter Controls */}
              <div className="flex flex-col justify-center lg:col-span-7">
                <p className="text-xs font-semibold tracking-wide text-[#1E3A8A]">
                  Banana Hill, Ruaka–Limuru Road <span aria-hidden="true">·</span> Kiambu County
                </p>

                <h1 className="mt-3 max-w-2xl font-display text-[2.35rem] leading-[1.08] font-semibold tracking-tight text-slate-950 [text-wrap:balance] sm:text-5xl lg:text-[3.35rem]">
                  Official School Uniforms &amp; Complete Kits for 30+ Kiambu Schools
                </h1>

                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                  Browse tailored Boys and Girls uniform sets, inspect Front, Side, and Back garment
                  angles, and pay seamlessly via M-Pesa Express or WhatsApp.
                </p>

                {/* Elevated Predictive Search Command Bar */}
                <div ref={searchContainerRef} className="relative mt-7 max-w-xl">
                  <label htmlFor="school-search-input" className="sr-only">
                    Search your child&apos;s school
                  </label>
                  <div className="relative flex items-center">
                    <Search
                      className="pointer-events-none absolute left-4 h-5 w-5 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      id="school-search-input"
                      type="text"
                      value={searchQuery}
                      onFocus={() => setSearchFocused(true)}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchFocused(true);
                      }}
                      placeholder="Search school name (e.g. Karuri High, Chief Koinange, Chantilly...)"
                      className="w-full rounded-xl border border-slate-300 bg-[#F9FAFB] py-4 pl-12 pr-11 text-sm text-slate-900 shadow-xs transition-all placeholder:text-slate-400 focus:border-[#0B1B42] focus:bg-white focus:ring-3 focus:ring-[#0B1B42]/10 focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear school search"
                        className="absolute right-3.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Predictive Auto-Complete Dropdown */}
                  {searchFocused && (
                    <div className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
                      {predictiveResults.length === 0 ? (
                        <div className="p-4 text-xs text-slate-500">
                          No school matched &ldquo;{searchQuery}&rdquo;. Call{' '}
                          <a
                            href="tel:+254703919406"
                            className="font-semibold text-[#0B1B42] underline"
                          >
                            +254 703 919406
                          </a>{' '}
                          for custom school tailoring.
                        </div>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {predictiveResults.map((school) => (
                            <li key={school.id}>
                              <button
                                type="button"
                                onClick={() => openSchoolKit(school)}
                                className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <span
                                    className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300"
                                    style={{ backgroundColor: school.colors.knitHex }}
                                    aria-hidden="true"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate font-display text-sm font-semibold text-slate-900">
                                      {school.name}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                      {school.location} <span aria-hidden="true">·</span>{' '}
                                      {school.level} <span aria-hidden="true">·</span>{' '}
                                      {school.genderType}
                                    </p>
                                  </div>
                                </div>
                                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#1E3A8A]">
                                  Open Kit <ChevronRight className="h-3.5 w-3.5" />
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Filter Controls */}
                <div
                  className="mt-5 flex flex-wrap gap-2"
                  role="group"
                  aria-label="Filter schools"
                >
                  {FILTER_PILLS.map((pill) => {
                    const isActive = activeFilter === pill;
                    return (
                      <button
                        key={pill}
                        type="button"
                        onClick={() => handleSelectFilter(pill)}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-[#0B1B42] text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-[#0B1B42] hover:text-[#0B1B42]'
                        }`}
                      >
                        {pill}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Utility Links */}
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-5 text-xs text-slate-600">
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-1.5 font-semibold text-[#0B1B42] hover:underline"
                  >
                    <Ruler className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                    <span>Size Guide &amp; Room to Grow Calculator</span>
                  </button>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    Same-day Ruaka, Muchatha &amp; Ndenderu Boda (KES 250)
                  </span>
                </div>
              </div>

              {/* Right: Editorial Kenyan Students Portrait */}
              <div className="lg:col-span-5">
                <div className="relative h-full min-h-[340px] overflow-hidden rounded-2xl bg-[#0B1B42] shadow-sm">
                  <img
                    src={heroStudentsImg}
                    alt="Smiling Kenyan secondary school students wearing crisp navy blazers, white shirts, striped ties, charcoal trousers and pleated skirt"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover lg:h-full"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07122D]/95 via-[#07122D]/55 to-transparent p-6 text-white">
                    <p className="text-xs font-medium text-amber-300">
                      Dressing To Inspire Success
                    </p>
                    <p className="mt-1 font-display text-lg font-medium leading-snug">
                      Verified official fabrics &amp; shades for Karuri High, Chief Koinange,
                      Loreto Limuru &amp; 27 local schools.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-Width Unboxed Architectural Proof Strip */}
            <div className="mt-10 grid grid-cols-2 divide-y divide-slate-200 border-t border-slate-200 pt-7 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              <div className="pb-4 pr-4 sm:pb-0">
                <p className="font-mono text-xl font-semibold text-[#0B1B42] tabular-nums sm:text-2xl">
                  30+ Schools
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  CBC Primary, Junior &amp; High Schools across Kiambu
                </p>
              </div>
              <div className="pb-4 pl-4 sm:px-6 sm:pb-0">
                <p className="font-mono text-xl font-semibold text-[#0B1B42] tabular-nums sm:text-2xl">
                  3-Angle View
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Inspect Front, Side Profile &amp; Back pleats before ordering
                </p>
              </div>
              <div className="pt-4 pr-4 sm:px-6 sm:pt-0">
                <p className="font-mono text-xl font-semibold text-[#0B1B42] tabular-nums sm:text-2xl">
                  2-Hr Pickup
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Free packing at our Banana Hill shopfront or KES 250 boda
                </p>
              </div>
              <div className="pt-4 pl-4 sm:pl-6 sm:pt-0">
                <p className="font-mono text-xl font-semibold text-[#0B1B42] tabular-nums sm:text-2xl">
                  M-Pesa STK
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Instant PIN checkout with verified receipt ledger
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Three-Department Gallery Showcase */}
        <section className="border-b border-slate-200 bg-[#F7F8FA] py-14 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold tracking-wide text-[#1E3A8A]">
                  Complete School Wardrobe
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Shop by Department
                </h2>
              </div>
              <p className="max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm">
                Separate dedicated tailoring for Girls, Boys, and PE Games Kits — stocked in full
                Term 1–3 growth sizes.
              </p>
            </div>

            <div className="grid gap-7 md:grid-cols-3">
              {/* 01. Girls School Uniform */}
              <button
                type="button"
                onClick={() => {
                  handleSelectFilter('Girls Kits');
                  document.getElementById('schools')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-left shadow-xs ring-1 ring-slate-200/80 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:ring-[#0B1B42]/40"
              >
                <div className="aspect-[4/3] w-full overflow-hidden studio-backdrop">
                  <img
                    src={DEPARTMENT_IMAGES.girls}
                    alt="Girls school uniform set featuring white blouse, striped tie, navy cardigan, pleated skirt, socks and buckle shoes"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                  <div>
                    <p className="font-mono text-[11px] font-medium text-[#1E3A8A]">01 · Girls</p>
                    <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
                      Girls School Uniform
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      Box-pleated skirts, tunics, crisp blouses, cardigans, knee-high socks &amp;
                      T-bar leather shoes.
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B1B42]">
                    Browse Girls Kits{' '}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>

              {/* 02. Boys School Uniform */}
              <button
                type="button"
                onClick={() => {
                  handleSelectFilter('Boys Kits');
                  document.getElementById('schools')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-left shadow-xs ring-1 ring-slate-200/80 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:ring-[#0B1B42]/40"
              >
                <div className="aspect-[4/3] w-full overflow-hidden studio-backdrop">
                  <img
                    src={DEPARTMENT_IMAGES.boys}
                    alt="Boys school uniform set featuring white shirt, striped tie, navy V-neck pullover, charcoal trousers and tailored blazer"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                  <div>
                    <p className="font-mono text-[11px] font-medium text-[#1E3A8A]">02 · Boys</p>
                    <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
                      Boys School Uniform
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      Tailored trousers and shorts, crisp shirts, V-neck knit pullovers, school
                      blazers &amp; leather lace-ups.
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B1B42]">
                    Browse Boys Kits{' '}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>

              {/* 03. PE Tracksuits & Accessories */}
              <button
                type="button"
                onClick={() => {
                  handleSelectFilter('All Schools');
                  document.getElementById('schools')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-left shadow-xs ring-1 ring-slate-200/80 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:ring-[#0B1B42]/40"
              >
                <div className="aspect-[4/3] w-full overflow-hidden studio-backdrop">
                  <img
                    src={DEPARTMENT_IMAGES.accessories}
                    alt="School tracksuits, polished black leather shoes, striped school ties, ribbed socks, belts and backpacks"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                  <div>
                    <p className="font-mono text-[11px] font-medium text-[#1E3A8A]">
                      03 · Games &amp; Essentials
                    </p>
                    <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
                      PE Tracksuits &amp; Accessories
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                      Official games kits, fleece tracksuits, school ties, ribbed socks, leather
                      shoes &amp; sturdy school essentials.
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B1B42]">
                    Explore Full Catalog{' '}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* 3. Studio Uniform Visual Catalog (Boys & Girls Shown Separately) */}
        <section id="schools" className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold tracking-wide text-[#1E3A8A]">
                  Verified Kiambu School Directory
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  {activeFilter === 'All Schools'
                    ? 'Boys & Girls Uniforms by School'
                    : activeFilter}
                </h2>
                <p className="mt-1.5 text-xs text-slate-600 sm:text-sm">
                  Showing{' '}
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {visibleUniformCards.length}
                  </span>{' '}
                  of{' '}
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {uniformCards.length}
                  </span>{' '}
                  verified {uniformCards.length === 1 ? 'uniform kit' : 'uniform kits'} across{' '}
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {filteredSchools.length}
                  </span>{' '}
                  schools.
                </p>
              </div>

              {/* Separate Boys / Girls Kit Switcher */}
              <div className="flex flex-wrap items-center gap-3">
                <div
                  role="tablist"
                  aria-label="Filter uniform catalog by student gender"
                  className="inline-flex rounded-xl border border-slate-200 bg-[#F7F8FA] p-1"
                >
                  {(
                    [
                      { id: 'all', label: 'All (Boys & Girls)' },
                      { id: 'Girls', label: 'Girls Uniforms' },
                      { id: 'Boys', label: 'Boys Uniforms' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={genderTab === tab.id}
                      onClick={() => {
                        setGenderTab(tab.id);
                        if (activeFilter === 'Boys Kits' || activeFilter === 'Girls Kits') {
                          setActiveFilter('All Schools');
                        }
                      }}
                      className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                        genderTab === tab.id
                          ? 'bg-[#0B1B42] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {isFilteredView && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveFilter('All Schools');
                      setGenderTab('all');
                    }}
                    className="cursor-pointer text-xs font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>

            {uniformCards.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-[#F7F8FA] p-12 text-center">
                <p className="font-display text-lg font-semibold text-slate-900">
                  No uniform kits match that search
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Try clearing your search or choosing &ldquo;All Schools&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('All Schools');
                    setGenderTab('all');
                  }}
                  className="mt-5 cursor-pointer rounded-lg bg-[#0B1B42] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#162C63]"
                >
                  Show All 30 Schools
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleUniformCards.map((entry) => {
                    const { school, gender, image, itemsSummary, itemCount, kitTotalKes } = entry;
                    return (
                      <article
                        key={entry.key}
                        className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-slate-200/80 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md hover:ring-[#0B1B42]/40"
                      >
                        {/* Studio Garment Stage */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden studio-backdrop">
                          <img
                            src={image}
                            alt={`${school.name} ${gender} school uniform`}
                            referrerPolicy="no-referrer"
                            onClick={() => openSchoolKit(school, gender)}
                            className="h-full w-full cursor-pointer object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                          />

                          {/* Bottom Image Scrim Bar: Swatches + Quick 3-Angle Trigger */}
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-[#07122D]/85 via-[#07122D]/40 to-transparent px-4 pb-3 pt-8 text-white">
                            <div className="flex items-center gap-1.5">
                              <span
                                title={school.colors.shirtName}
                                className="h-3 w-3 rounded-full border border-white/80"
                                style={{ backgroundColor: school.colors.shirtHex }}
                              />
                              <span
                                title={school.colors.knitName}
                                className="h-3 w-3 rounded-full border border-white/80"
                                style={{ backgroundColor: school.colors.knitHex }}
                              />
                              <span
                                title={school.colors.bottomName}
                                className="h-3 w-3 rounded-full border border-white/80"
                                style={{ backgroundColor: school.colors.bottomHex }}
                              />
                              <span className="ml-1 text-[11px] font-medium text-white/95">
                                {school.colors.primaryName}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSpotlightSchool(school);
                                setSpotlightGender(gender);
                                document
                                  .getElementById('uniform-angles')
                                  ?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-xs transition-colors hover:bg-white"
                            >
                              <Eye className="h-3 w-3 text-[#0B1B42]" aria-hidden="true" />
                              <span>3-View</span>
                            </button>
                          </div>
                        </div>

                        {/* Gallery Card Body */}
                        <div className="flex flex-1 flex-col justify-between p-5">
                          <div>
                            <p className="text-xs text-slate-500">
                              {gender} Uniform <span aria-hidden="true">·</span> {school.location}{' '}
                              <span aria-hidden="true">·</span> {school.level}
                            </p>
                            <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug text-slate-900">
                              {school.name} — {gender} Kit
                            </h3>
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                              Includes {itemsSummary} ({itemCount} pieces).
                            </p>
                          </div>

                          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                            <div>
                              <span className="block text-[11px] text-slate-500">Complete Kit</span>
                              <span className="font-mono text-base font-semibold text-slate-950 tabular-nums">
                                {formatKes(kitTotalKes)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => openSchoolKit(school, gender)}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                                gender === 'Boys'
                                  ? 'bg-[#0B1B42] text-white hover:bg-[#162C63]'
                                  : 'bg-amber-400 text-[#0B1B42] hover:bg-amber-300'
                              }`}
                            >
                              <span>Select {gender} Sizes</span>
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Curated Expand Control when unfiltered */}
                {!isFilteredView && uniformCards.length > INITIAL_VISIBLE_KITS && (
                  <div className="mt-10 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllKits((prev) => !prev)}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-xs font-semibold text-slate-900 shadow-xs transition-all hover:border-[#0B1B42] hover:bg-slate-50"
                    >
                      <span>
                        {showAllKits
                          ? 'Show Featured 9 Kits Only'
                          : `Browse All ${uniformCards.length} Verified Uniform Kits (30 Schools)`}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-150 ${
                          showAllKits ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* 4. Deep Heritage Navy 3-Angle Uniform Inspection Spotlight */}
        <section id="uniform-angles" className="bg-[#0B1B42] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <p className="text-xs font-semibold tracking-wide text-amber-300">
                  Front <span aria-hidden="true">·</span> Side Profile{' '}
                  <span aria-hidden="true">·</span> Back View
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold leading-[1.12] tracking-tight text-white [text-wrap:balance] sm:text-4xl">
                  Inspect Every Seam &amp; Pleat Before You Order
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  Switch seamlessly between Front View, Side Profile, and Back View to inspect
                  collar construction, skirt knife-pleats, blazer back vents, and shoe sole profiles
                  for any school in our Banana Hill catalog.
                </p>

                <div className="mt-7 space-y-4 rounded-2xl border border-white/12 bg-white/[0.04] p-5">
                  <label className="block text-xs">
                    <span className="mb-2 block font-semibold text-slate-200">
                      Preview School Colours &amp; Tailoring
                    </span>
                    <select
                      value={spotlightSchool.id}
                      onChange={(e) => {
                        const next = SCHOOLS.find((s) => s.id === e.target.value) || SCHOOLS[0];
                        setSpotlightSchool(next);
                        setSpotlightGender(next.genderType === 'Girls' ? 'Girls' : 'Boys');
                      }}
                      className="w-full rounded-xl border border-white/15 bg-[#07122D] px-3.5 py-2.5 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                    >
                      {SCHOOLS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.location})
                        </option>
                      ))}
                    </select>
                  </label>

                  {spotlightSchool.genderType === 'Mixed' && (
                    <div className="inline-flex rounded-xl border border-white/15 bg-[#07122D] p-1">
                      {(['Boys', 'Girls'] as StudentGender[]).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setSpotlightGender(g)}
                          className={`cursor-pointer rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                            spotlightGender === g
                              ? 'bg-amber-400 text-[#0B1B42]'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {g} Kit
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => openSchoolKit(spotlightSchool, spotlightGender)}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-xs font-bold text-[#0B1B42] transition-colors hover:bg-amber-300"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Configure {spotlightSchool.name} Kit</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <UniformAngleViewer
                  school={spotlightSchool}
                  gender={spotlightGender}
                  variant="dark"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 5. Smiling Students & Banana Hill Storefront Section */}
        <StoreShowcaseSection />
      </main>

      {/* Architectural Deep Navy Footer */}
      <footer className="border-t border-slate-800 bg-[#07112B] py-12 text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-3.5">
            <img
              src="/assets/aistudio/image_89c10cc6.png"
              alt="Banana Uniform Centre crest"
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-xl bg-[#0B1B42] object-contain p-1 ring-1 ring-white/15"
            />
            <div>
              <p className="font-display text-base font-semibold text-white">
                Banana Uniform Centre
              </p>
              <p className="text-xs text-slate-400">
                Dressing To Inspire Success <span aria-hidden="true">·</span> Banana Hill,
                Ruaka–Limuru Road, Kiambu
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs">
            <a href="tel:+254703919406" className="font-mono hover:text-white">
              +254 703 919406 (Tom Njenga Mwangi)
            </a>
            <a href="tel:+254721476461" className="font-mono hover:text-white">
              0721 476 461
            </a>
            <button
              type="button"
              onClick={() => setLedgerOpen(true)}
              className="cursor-pointer font-semibold text-amber-300 hover:underline"
            >
              M-Pesa Transaction Ledger
            </button>
          </div>
        </div>
      </footer>

      {/* Toast Notification when Kit added */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-white/10 bg-[#0B1B42] px-4 py-3 text-xs text-white shadow-2xl">
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => {
              setToastMsg(null);
              setCartOpen(true);
            }}
            className="cursor-pointer rounded-md bg-amber-400 px-3 py-1 font-bold text-[#0B1B42] hover:bg-amber-300 whitespace-nowrap"
          >
            Checkout
          </button>
        </div>
      )}

      {/* Interactive Modals & Drawers */}
      <SchoolBundleBuilder
        school={selectedSchool}
        initialGender={selectedGender}
        sizeGuideApplyPayload={sizeGuideApplyPayload}
        onClose={() => setSelectedSchool(null)}
        onAddKitToCart={handleAddKitToCart}
        onOpenSizeGuide={() => setSizeGuideOpen(true)}
      />

      <SizeGuideModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        onApplyRecommendation={(rec) => {
          setSizeGuideApplyPayload({
            ...rec,
            appliedAt: Date.now(),
          });
          setToastMsg('Recommended sizes saved for your kit.');
          setTimeout(() => setToastMsg(null), 4000);
        }}
      />

      <CartCheckoutDrawer
        open={cartOpen}
        items={cart}
        currentUser={currentUser}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        onTransactionRecorded={() => {}}
      />

      <TransactionsModal
        open={ledgerOpen}
        currentUser={currentUser}
        onClose={() => setLedgerOpen(false)}
      />
    </div>
  );
}
