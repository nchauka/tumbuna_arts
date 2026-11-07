import Svg, { Circle, Path, Rect } from 'react-native-svg';

const P: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  heritage: 'M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z',
  bag: 'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  back: 'M15 5l-7 7 7 7',
  chev: 'M9 5l7 7-7 7',
  down: 'M5 9l7 7 7-7',
  close: 'M6 6l12 12M18 6L6 18',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chart: 'M6 20v-9M12 20V5M18 20v-6M3 20h18',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  filter: 'M4 6h16M7 12h10M10 18h4',
  share: 'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z',
  play: 'M8 5l11 7-11 7z',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3zM3 7l12-3v3M16 13.5h2',
  // Kundu drum: the design system's certificate icon.
  cert: 'M7.5 3h9l-3 9 3 9h-9l3-9zM9 6.5h6M9 17.5h6',
  truck: 'M2 6h12v10H2zM14 10h4l3 3v3h-7',
  leaf: 'M5 19c0-9 6-14 15-14 0 9-5 15-14 15M5 19l7-7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A16.5 16.5 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6',
  logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  mail: 'M3 6h18v12H3zM3 6l9 7 9-7',
  phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  chat: 'M4 5h16v11H9l-5 4z',
  flash: 'M13 2L4 14h7l-1 8 9-12h-7z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  user: '',
  search: '',
  pin: '',
  globe: '',
  help: '',
  sliders: '',
  grid: '',
  mic: '',
  seal: '',
  info: '',
  clock: '',
  bilum: '',
};

export type IconName = keyof typeof P;

type Props = {
  name: IconName; size?: number; color: string; fill?: string; strokeWidth?: number;
  /** Solid variant used for the selected tab. Inner details are drawn in `inner` (the surface behind the icon). */
  filled?: boolean; inner?: string;
};

// Bilum: looped string bag with a forehead strap and a zigzag band — the Heritage archive icon.
const BILUM_BODY = 'M4.5 9.5h15l-1.6 10a2 2 0 0 1-2 1.7H8.1a2 2 0 0 1-2-1.7z';
const BILUM_STRAP = 'M8 9.5C8 5.2 9.8 3 12 3s4 2.2 4 6.5';
const BILUM_ZIGZAG = 'M6.6 14.2l1.8 1.8 1.8-1.8 1.8 1.8 1.8-1.8 1.8 1.8 1.8-1.8';

/** Selected-tab glyphs: solid shapes, with interior lines cut out in the background colour. */
function filledGlyph(name: IconName, color: string, inner: string) {
  const cut = { stroke: inner, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const line = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home': return <Path d={P.home} fill={color} {...line} />;
    case 'search': return <><Circle cx={11} cy={11} r={7.5} fill={color} /><Path d="M20.5 20.5L16 16" {...line} strokeWidth={2.6} /></>;
    case 'bilum': return <><Path d={BILUM_STRAP} {...line} fill="none" /><Path d={BILUM_BODY} fill={color} {...line} /><Path d={BILUM_ZIGZAG} {...cut} /></>;
    case 'heart': return <Path d={P.heart} fill={color} {...line} />;
    case 'user': return <><Circle cx={12} cy={8} r={4.5} fill={color} /><Path d="M3.5 21.5a8.5 8.5 0 0 1 17 0z" fill={color} {...line} /></>;
    case 'chart': return <>{[[4.5, 11, 9], [10.5, 5, 15], [16.5, 14, 6]].map(([x, y, h]) => <Rect key={x} x={x} y={y} width={3.5} height={h} rx={1.2} fill={color} />)}<Path d="M3 20.5h18" {...line} /></>;
    case 'grid': return <>{[[4, 4], [13, 4], [4, 13], [13, 13]].map(([x, y]) => <Rect key={`${x}${y}`} x={x} y={y} width={7} height={7} rx={1.8} fill={color} />)}</>;
    case 'box': return <><Path d={P.box.split('M3 7l9 4')[0]} fill={color} {...line} /><Path d="M4 7.5l8 3.6 8-3.6M12 11.1V20" {...cut} /></>;
    case 'wallet': return <><Path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3z" fill={color} {...line} /><Path d="M15 4v3" {...line} /><Path d="M16 13.5h2" {...cut} strokeWidth={2.4} /></>;
    default: return null;
  }
}

export function Icon({ name, size = 22, color, fill = 'none', strokeWidth = 2, filled, inner = '#FFFFFF' }: Props) {
  const solid = filled ? filledGlyph(name, color, inner) : null;
  if (solid) return <Svg width={size} height={size} viewBox="0 0 24 24">{solid}</Svg>;
  const sp = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill };
  const extra = () => {
    switch (name) {
      case 'bilum': return <><Path d={BILUM_STRAP} {...sp} fill="none" /><Path d={BILUM_BODY} {...sp} /><Path d={BILUM_ZIGZAG} {...sp} fill="none" strokeWidth={1.6} /></>;
      case 'user': return <><Circle cx={12} cy={8} r={4} {...sp} /><Path d="M4 21a8 8 0 0 1 16 0" {...sp} fill="none" /></>;
      case 'search': return <><Circle cx={11} cy={11} r={7} {...sp} /><Path d="M20 20l-4-4" {...sp} /></>;
      case 'pin': return <><Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" {...sp} /><Circle cx={12} cy={10} r={2.3} {...sp} fill="none" /></>;
      case 'globe': return <><Circle cx={12} cy={12} r={9} {...sp} /><Path d="M3 12h18M12 3c3.2 3.6 3.2 14.4 0 18M12 3c-3.2 3.6-3.2 14.4 0 18" {...sp} fill="none" /></>;
      case 'help': return <><Circle cx={12} cy={12} r={9} {...sp} /><Path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17.5v.01" {...sp} fill="none" /></>;
      case 'info': return <><Circle cx={12} cy={12} r={9} {...sp} /><Path d="M12 11v6M12 7.5v.01" {...sp} fill="none" /></>;
      case 'clock': return <><Circle cx={12} cy={12} r={9} {...sp} /><Path d="M12 7v5l3 2" {...sp} fill="none" /></>;
      case 'sliders': return <><Path d="M4 7h10M18 7h2M4 17h4M12 17h8" {...sp} /><Circle cx={16} cy={7} r={2} {...sp} /><Circle cx={10} cy={17} r={2} {...sp} /></>;
      case 'grid': return <>{[[4, 4], [13, 4], [4, 13], [13, 13]].map(([x, y]) => <Rect key={`${x}${y}`} x={x} y={y} width={7} height={7} rx={1.5} {...sp} />)}</>;
      case 'mic': return <><Rect x={9} y={3} width={6} height={11} rx={3} {...sp} /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...sp} fill="none" /></>;
      case 'camera': return <><Path d={P.camera} {...sp} /><Circle cx={12} cy={13} r={3.5} {...sp} fill="none" /></>;
      case 'truck': return <><Path d={P.truck} {...sp} /><Circle cx={6} cy={18} r={2} {...sp} /><Circle cx={17} cy={18} r={2} {...sp} /></>;
      case 'eye': return <><Path d={P.eye} {...sp} /><Circle cx={12} cy={12} r={3} {...sp} /></>;
      case 'seal': return <>
        <Path fill={color} d="M12 1.8l2.5 1.9 3.1.1 1 3 2.5 1.8-.9 3 .9 3-2.5 1.8-1 3-3.1.1L12 22.2l-2.5-1.9-3.1-.1-1-3-2.5-1.8.9-3-.9-3 2.5-1.8 1-3 3.1-.1z" />
        <Path d="M8.3 12.2l2.5 2.5 4.9-5" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>;
      default: return <Path d={P[name]} {...sp} />;
    }
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24">{extra()}</Svg>;
}
