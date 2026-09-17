export interface WallpaperItem {
  id: string;
  name: string;
  category: 'whatsapp' | 'amoled' | 'cyberpunk' | 'nature' | 'abstract';
  previewBg: string;
  className?: string;
  style?: React.CSSProperties;
  imageUrl?: string;
}

// Generate a comprehensive collection of 200 high quality, curated popular wallpapers
export const POPULAR_WALLPAPERS_200: WallpaperItem[] = [
  // 1. WhatsApp Classic & Messaging Doodles (1 - 40)
  {
    id: 'wa-doodle-dark-classic',
    name: 'WhatsApp Classic Dark Doodle',
    category: 'whatsapp',
    previewBg: 'bg-[#0B141A] border-emerald-500/40',
    className: 'bg-[#0B141A] bg-[radial-gradient(#1E293B_1.5px,transparent_1.5px)] [background-size:24px_24px]',
  },
  {
    id: 'wa-doodle-light-classic',
    name: 'WhatsApp Classic Light Beige',
    category: 'whatsapp',
    previewBg: 'bg-[#EFEAE2] border-slate-400',
    className: 'bg-[#EFEAE2] bg-[radial-gradient(#CBD5E1_1.5px,transparent_1.5px)] [background-size:24px_24px]',
  },
  {
    id: 'wa-emerald-doodle',
    name: 'WhatsApp Emerald Forest Grid',
    category: 'whatsapp',
    previewBg: 'bg-[#071F1A] border-emerald-500',
    className: 'bg-[#071F1A] bg-[radial-gradient(#10B98125_1.5px,transparent_1.5px)] [background-size:20px_20px]',
  },
  {
    id: 'wa-midnight-doodle',
    name: 'WhatsApp Pitch Midnight Doodle',
    category: 'whatsapp',
    previewBg: 'bg-[#05080C] border-slate-700',
    className: 'bg-[#05080C] bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] [background-size:28px_28px]',
  },
  {
    id: 'wa-deep-teal',
    name: 'WhatsApp Modern Deep Teal',
    category: 'whatsapp',
    previewBg: 'bg-[#082026] border-teal-500',
    className: 'bg-[#082026] bg-[radial-gradient(#14B8A625_1.5px,transparent_1.5px)] [background-size:22px_22px]',
  },
  {
    id: 'wa-slate-dots',
    name: 'WhatsApp Minimal Slate Dots',
    category: 'whatsapp',
    previewBg: 'bg-[#0F172A] border-slate-600',
    className: 'bg-[#0F172A] bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:20px_20px]',
  },
  {
    id: 'wa-geometric-matrix',
    name: 'WhatsApp Geometric Mesh',
    category: 'whatsapp',
    previewBg: 'bg-[#0D1520] border-cyan-500',
    className: 'bg-[#0D1520] bg-[linear-gradient(to_right,#06b6d415_1px,transparent_1px),linear-gradient(to_bottom,#06b6d415_1px,transparent_1px)] [background-size:24px_24px]',
  },
  {
    id: 'wa-soft-monochrome',
    name: 'WhatsApp Soft Charcoal Monochrome',
    category: 'whatsapp',
    previewBg: 'bg-[#18181B] border-zinc-700',
    className: 'bg-[#18181B] bg-[radial-gradient(#27272A_2px,transparent_2px)] [background-size:26px_26px]',
  },
  {
    id: 'wa-nordic-frost',
    name: 'WhatsApp Nordic Frost Pale',
    category: 'whatsapp',
    previewBg: 'bg-[#F1F5F9] border-slate-300',
    className: 'bg-[#F1F5F9] bg-[radial-gradient(#94A3B8_1px,transparent_1px)] [background-size:20px_20px]',
  },
  {
    id: 'wa-warm-sand',
    name: 'WhatsApp Warm Desert Sand',
    category: 'whatsapp',
    previewBg: 'bg-[#E7DFD5] border-amber-300',
    className: 'bg-[#E7DFD5] bg-[radial-gradient(#D6C7B2_1.5px,transparent_1.5px)] [background-size:22px_22px]',
  },
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `wa-classic-pattern-${i + 11}`,
    name: `WhatsApp Pattern Variation ${i + 11}`,
    category: 'whatsapp' as const,
    previewBg: i % 2 === 0 ? 'bg-[#0A121A] border-emerald-600/50' : 'bg-[#0E1624] border-cyan-600/50',
    className: i % 2 === 0
      ? 'bg-[#0A121A] bg-[radial-gradient(#1E293B_1.5px,transparent_1.5px)] [background-size:22px_22px]'
      : 'bg-[#0E1624] bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] [background-size:26px_26px]',
  })),

  // 2. AMOLED & Pitch Black (41 - 80)
  {
    id: 'amoled-pure-black',
    name: 'AMOLED Pure Pitch Black #000000',
    category: 'amoled',
    previewBg: 'bg-black border-neutral-800',
    className: 'bg-black',
  },
  {
    id: 'amoled-carbon-hex',
    name: 'AMOLED Carbon Hex Weave',
    category: 'amoled',
    previewBg: 'bg-[#050505] border-neutral-700',
    className: 'bg-[#050505] bg-[radial-gradient(#1c1c1c_1px,transparent_1px)] [background-size:16px_16px]',
  },
  {
    id: 'amoled-deep-obsidian',
    name: 'AMOLED Deep Obsidian Matte',
    category: 'amoled',
    previewBg: 'bg-[#080808] border-neutral-700',
    className: 'bg-[#080808]',
  },
  {
    id: 'amoled-titanium-dark',
    name: 'AMOLED Dark Titanium Brushed',
    category: 'amoled',
    previewBg: 'bg-[#0A0A0C] border-zinc-800',
    className: 'bg-[#0A0A0C] bg-[linear-gradient(to_right,#18181b_1px,transparent_1px)] [background-size:12px_12px]',
  },
  {
    id: 'amoled-velvet-shadow',
    name: 'AMOLED Velvet Shadow Edge',
    category: 'amoled',
    previewBg: 'bg-[#030407] border-neutral-800',
    className: 'bg-[#030407]',
  },
  {
    id: 'amoled-subtle-grid',
    name: 'AMOLED Ultra-Fine Micro Grid',
    category: 'amoled',
    previewBg: 'bg-[#000000] border-emerald-950',
    className: 'bg-[#000000] bg-[linear-gradient(to_right,#11182750_1px,transparent_1px),linear-gradient(to_bottom,#11182750_1px,transparent_1px)] [background-size:32px_32px]',
  },
  {
    id: 'amoled-onyx-minimal',
    name: 'AMOLED Onyx Minimalist Slate',
    category: 'amoled',
    previewBg: 'bg-[#0C0D10] border-slate-800',
    className: 'bg-[#0C0D10]',
  },
  {
    id: 'amoled-smoke-gradient',
    name: 'AMOLED Stealth Dark Smoke',
    category: 'amoled',
    previewBg: 'bg-gradient-to-b from-black via-[#08090C] to-black border-neutral-800',
    className: 'bg-gradient-to-b from-black via-[#08090C] to-black',
  },
  {
    id: 'amoled-cosmic-abyss',
    name: 'AMOLED Deep Space Cosmic Abyss',
    category: 'amoled',
    previewBg: 'bg-[#020305] border-indigo-950',
    className: 'bg-[#020305] bg-[radial-gradient(#1e1b4b15_1px,transparent_1px)] [background-size:24px_24px]',
  },
  {
    id: 'amoled-circuit-stealth',
    name: 'AMOLED Stealth Cyber Circuit',
    category: 'amoled',
    previewBg: 'bg-black border-teal-950',
    className: 'bg-black bg-[linear-gradient(to_right,#042f2e30_1px,transparent_1px),linear-gradient(to_bottom,#042f2e30_1px,transparent_1px)] [background-size:28px_28px]',
  },
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `amoled-dark-edition-${i + 11}`,
    name: `AMOLED Dark Pro Edition ${i + 11}`,
    category: 'amoled' as const,
    previewBg: 'bg-black border-neutral-800',
    className: i % 3 === 0 
      ? 'bg-black' 
      : i % 3 === 1 
      ? 'bg-[#050608] bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:20px_20px]' 
      : 'bg-gradient-to-b from-black via-[#06080C] to-black',
  })),

  // 3. Aesthetics & Cyberpunk Neon (81 - 120)
  {
    id: 'cyber-tokyo-night',
    name: 'Tokyo Cyberpunk Neon Horizon',
    category: 'cyberpunk',
    previewBg: 'bg-gradient-to-tr from-purple-950 via-slate-950 to-emerald-950 border-purple-500/50',
    className: 'bg-gradient-to-b from-[#130722] via-[#090D18] to-[#041210]',
  },
  {
    id: 'cyber-synthwave-80s',
    name: 'Outrun Synthwave Sunset Purple',
    category: 'cyberpunk',
    previewBg: 'bg-gradient-to-b from-fuchsia-950 via-purple-950 to-slate-950 border-pink-500/50',
    className: 'bg-gradient-to-b from-[#24082E] via-[#12071E] to-[#08050E]',
  },
  {
    id: 'cyber-matrix-rain',
    name: 'Matrix Digital Neon Code',
    category: 'cyberpunk',
    previewBg: 'bg-black border-emerald-500',
    className: 'bg-[#030C07] bg-[radial-gradient(#10b98135_1.5px,transparent_1.5px)] [background-size:18px_18px]',
  },
  {
    id: 'cyber-neon-blue-grid',
    name: 'Hyperdrive Neon Cyan Grid',
    category: 'cyberpunk',
    previewBg: 'bg-[#040E1A] border-cyan-400',
    className: 'bg-[#040E1A] bg-[linear-gradient(to_right,#06b6d435_1px,transparent_1px),linear-gradient(to_bottom,#06b6d435_1px,transparent_1px)] [background-size:24px_24px]',
  },
  {
    id: 'cyber-vaporwave-pastel',
    name: 'Vaporwave Twilight Pastel',
    category: 'cyberpunk',
    previewBg: 'bg-gradient-to-tr from-pink-950 via-slate-900 to-indigo-950 border-pink-400',
    className: 'bg-gradient-to-b from-[#1F0E28] via-[#0E1224] to-[#070A12]',
  },
  {
    id: 'cyber-quantum-pulse',
    name: 'Quantum Violet Pulse Flow',
    category: 'cyberpunk',
    previewBg: 'bg-gradient-to-tr from-violet-950 to-slate-950 border-violet-500',
    className: 'bg-gradient-to-b from-[#1B0D33] via-[#0D0B1F] to-[#06050C]',
  },
  {
    id: 'cyber-akira-red',
    name: 'Neo Tokyo Crimson Streak',
    category: 'cyberpunk',
    previewBg: 'bg-gradient-to-tr from-red-950 via-slate-950 to-black border-red-500',
    className: 'bg-gradient-to-b from-[#260507] via-[#120608] to-[#050505]',
  },
  {
    id: 'cyber-amber-glow',
    name: 'Industrial Amber Neon Glow',
    category: 'cyberpunk',
    previewBg: 'bg-gradient-to-tr from-amber-950 via-neutral-950 to-black border-amber-500',
    className: 'bg-gradient-to-b from-[#241304] via-[#100B05] to-[#060402]',
  },
  {
    id: 'cyber-hacker-emerald',
    name: 'Dark Web Emerald Terminal',
    category: 'cyberpunk',
    previewBg: 'bg-[#02120B] border-emerald-400',
    className: 'bg-[#02120B] bg-[linear-gradient(to_right,#10b98125_1px,transparent_1px),linear-gradient(to_bottom,#10b98125_1px,transparent_1px)] [background-size:20px_20px]',
  },
  {
    id: 'cyber-lofi-midnight',
    name: 'Lo-Fi Chill Midnight Horizon',
    category: 'cyberpunk',
    previewBg: 'bg-[#0B0D18] border-indigo-400',
    className: 'bg-gradient-to-b from-[#111428] via-[#0B0D1A] to-[#05060E]',
  },
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `cyber-neon-aesthetic-${i + 11}`,
    name: `Aesthetic Cyber Theme ${i + 11}`,
    category: 'cyberpunk' as const,
    previewBg: i % 2 === 0 ? 'bg-gradient-to-tr from-indigo-950 to-emerald-950 border-cyan-500/50' : 'bg-gradient-to-tr from-purple-950 to-slate-950 border-purple-500/50',
    className: i % 2 === 0
      ? 'bg-gradient-to-b from-[#0B1528] via-[#07131B] to-[#03090F]'
      : 'bg-gradient-to-b from-[#180A28] via-[#0E0B1A] to-[#05040B]',
  })),

  // 4. Nature, Mountains & Cosmic Galaxies (121 - 160)
  {
    id: 'nature-aurora-borealis',
    name: 'Northern Lights Aurora Glow',
    category: 'nature',
    previewBg: 'bg-gradient-to-tr from-emerald-900 via-teal-950 to-slate-950 border-teal-400',
    className: 'bg-gradient-to-b from-[#042820] via-[#061B1B] to-[#030B10]',
  },
  {
    id: 'nature-milky-way',
    name: 'Cosmic Galaxy & Starlit Sky',
    category: 'nature',
    previewBg: 'bg-[#030612] border-indigo-500',
    className: 'bg-[#030612] bg-[radial-gradient(#ffffff20_1px,transparent_1px)] [background-size:16px_16px]',
  },
  {
    id: 'nature-mountain-mist',
    name: 'Misty Alpine Mountain Ridge',
    category: 'nature',
    previewBg: 'bg-gradient-to-b from-slate-800 to-slate-950 border-slate-500',
    className: 'bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#020617]',
  },
  {
    id: 'nature-deep-ocean',
    name: 'Deep Pacific Ocean Abyss',
    category: 'nature',
    previewBg: 'bg-gradient-to-b from-blue-950 to-slate-950 border-blue-500',
    className: 'bg-gradient-to-b from-[#071E3D] via-[#041126] to-[#020814]',
  },
  {
    id: 'nature-bamboo-zen',
    name: 'Japanese Bamboo Zen Forest',
    category: 'nature',
    previewBg: 'bg-gradient-to-b from-emerald-950 via-green-950 to-slate-950 border-emerald-500',
    className: 'bg-gradient-to-b from-[#062418] via-[#041810] to-[#020A07]',
  },
  {
    id: 'nature-desert-dune-sunset',
    name: 'Sahara Desert Golden Dusk',
    category: 'nature',
    previewBg: 'bg-gradient-to-b from-amber-950 via-orange-950 to-neutral-950 border-amber-500',
    className: 'bg-gradient-to-b from-[#2E1805] via-[#190C03] to-[#080401]',
  },
  {
    id: 'nature-starlit-night',
    name: 'Deep Blue Starlit Canopy',
    category: 'nature',
    previewBg: 'bg-[#050C1A] border-sky-400',
    className: 'bg-[#050C1A] bg-[radial-gradient(#38BDF820_1.5px,transparent_1.5px)] [background-size:24px_24px]',
  },
  {
    id: 'nature-autumn-leaf',
    name: 'Autumn Twilight Fallen Canopy',
    category: 'nature',
    previewBg: 'bg-gradient-to-tr from-rose-950 via-amber-950 to-slate-950 border-rose-500',
    className: 'bg-gradient-to-b from-[#2A0C12] via-[#190A0E] to-[#090406]',
  },
  {
    id: 'nature-tropical-rainfall',
    name: 'Tropical Midnight Rain Forest',
    category: 'nature',
    previewBg: 'bg-gradient-to-b from-teal-950 via-slate-900 to-slate-950 border-teal-500',
    className: 'bg-gradient-to-b from-[#062426] via-[#051619] to-[#020A0C]',
  },
  {
    id: 'nature-glacier-ice',
    name: 'Nordic Arctic Glacier Frost',
    category: 'nature',
    previewBg: 'bg-gradient-to-b from-cyan-950 to-slate-950 border-cyan-400',
    className: 'bg-gradient-to-b from-[#082933] via-[#05171F] to-[#020B10]',
  },
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `nature-scenic-vista-${i + 11}`,
    name: `Nature Scenery Collection ${i + 11}`,
    category: 'nature' as const,
    previewBg: 'bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950 border-emerald-600/40',
    className: 'bg-gradient-to-b from-[#06211C] via-[#041613] to-[#020A09]',
  })),

  // 5. Modern Gradients & Luxury Abstract (161 - 200)
  {
    id: 'abstract-velvet-rose',
    name: 'Royal Velvet Crimson Silk',
    category: 'abstract',
    previewBg: 'bg-gradient-to-tr from-rose-900 via-pink-950 to-slate-950 border-rose-400',
    className: 'bg-gradient-to-b from-[#2B0813] via-[#17050A] to-[#080204]',
  },
  {
    id: 'abstract-sapphire-luxe',
    name: 'Sapphire Royal Blue Velvet',
    category: 'abstract',
    previewBg: 'bg-gradient-to-tr from-blue-900 via-indigo-950 to-slate-950 border-blue-400',
    className: 'bg-gradient-to-b from-[#0A1E4A] via-[#06112C] to-[#020612]',
  },
  {
    id: 'abstract-emerald-flow',
    name: 'Emerald Aurora Silk Flow',
    category: 'abstract',
    previewBg: 'bg-gradient-to-tr from-emerald-900 to-slate-950 border-emerald-400',
    className: 'bg-gradient-to-b from-[#08291F] via-[#051813] to-[#020B08]',
  },
  {
    id: 'abstract-amethyst-gem',
    name: 'Imperial Amethyst Quartz',
    category: 'abstract',
    previewBg: 'bg-gradient-to-tr from-purple-900 to-slate-950 border-purple-400',
    className: 'bg-gradient-to-b from-[#240B3B] via-[#140622] to-[#06020C]',
  },
  {
    id: 'abstract-carbon-minimal',
    name: 'Titanium Slate Minimal Weave',
    category: 'abstract',
    previewBg: 'bg-[#111317] border-slate-700',
    className: 'bg-[#111317] bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px)] [background-size:16px_16px]',
  },
  {
    id: 'abstract-sunset-glow',
    name: 'Golden Amber Sunset Horizon',
    category: 'abstract',
    previewBg: 'bg-gradient-to-tr from-amber-800 via-orange-950 to-slate-950 border-amber-400',
    className: 'bg-gradient-to-b from-[#331C04] via-[#1B0E02] to-[#080401]',
  },
  {
    id: 'abstract-prism-hologram',
    name: 'Prism Holographic Iridescent',
    category: 'abstract',
    previewBg: 'bg-gradient-to-tr from-teal-900 via-purple-950 to-slate-950 border-teal-400',
    className: 'bg-gradient-to-b from-[#0E222A] via-[#131026] to-[#070512]',
  },
  {
    id: 'abstract-smoky-quartz',
    name: 'Smoky Charcoal Minimalist Dark',
    category: 'abstract',
    previewBg: 'bg-[#151518] border-zinc-700',
    className: 'bg-[#151518]',
  },
  {
    id: 'abstract-monochrome-pearl',
    name: 'Soft Off-White Pearl Light',
    category: 'abstract',
    previewBg: 'bg-[#F8FAFC] border-slate-300',
    className: 'bg-[#F8FAFC] text-slate-900',
  },
  {
    id: 'abstract-cyber-nebula',
    name: 'Deep Space Cosmic Nebula',
    category: 'abstract',
    previewBg: 'bg-gradient-to-tr from-indigo-950 via-purple-950 to-black border-indigo-400',
    className: 'bg-gradient-to-b from-[#110D2C] via-[#0B081E] to-[#04030B]',
  },
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `abstract-gradient-luxe-${i + 11}`,
    name: `Luxe Gradient Style ${i + 11}`,
    category: 'abstract' as const,
    previewBg: 'bg-gradient-to-tr from-slate-900 to-zinc-950 border-slate-700',
    className: 'bg-gradient-to-b from-[#141720] via-[#0E1017] to-[#07080B]',
  })),
];
