import { Image } from 'expo-image';
import { useId } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Pattern, Polyline, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { ArtPattern } from '@/data/types';

type Props = { pattern: ArtPattern; variant?: number; uri?: string; style?: StyleProp<ViewStyle>; seed?: number };

const BILUM = [
  ['#F4B400', '#D62828', '#1C1C1C'],
  ['#C9A46B', '#6B4226', '#2E241C'],
  ['#D62828', '#F4B400', '#FFFFFF'],
];

/**
 * Artwork imagery. Uploaded photos render as images; seed works render a generated
 * material texture (bilum loops, wood grain, tapa rings…) so the catalogue needs no stock photos.
 */
export function ArtImage({ pattern, variant = 0, uri, style, seed = 1 }: Props) {
  const raw = useId();
  const id = raw.replace(/[^a-zA-Z0-9]/g, '');
  if (uri) {
    return <Image source={{ uri }} style={[{ backgroundColor: '#E6E0DA' }, style as object]} contentFit="cover" transition={200} />;
  }
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: '#8B5E3C' }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice">
        {render(pattern, variant, id, seed)}
      </Svg>
    </View>
  );
}

function render(p: ArtPattern, v: number, id: string, seed: number) {
  switch (p) {
    case 'bilum': {
      const [bg, a, b] = BILUM[v % BILUM.length];
      return <>
        <Defs>
          <Pattern id={`b${id}`} patternUnits="userSpaceOnUse" width={16} height={16}>
            <Rect width={16} height={16} fill={bg} />
            <Polyline points="0,5 4,1 8,5 12,1 16,5" stroke={a} strokeWidth={2.6} fill="none" />
            <Polyline points="0,13 4,9 8,13 12,9 16,13" stroke={b} strokeWidth={2.6} fill="none" />
          </Pattern>
        </Defs>
        <Rect width={100} height={125} fill={`url(#b${id})`} />
        <Rect y={52} width={100} height={14} fill={b} opacity={0.9} />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <Path key={i} d={`M${i * 16 + 2} 59 l6 -5 l6 5 l-6 5z`} fill={a} />)}
      </>;
    }
    case 'carve': {
      const dark = v === 2;
      return <>
        <Defs>
          <RadialGradient id={`g${id}`} cx="50%" cy="35%" r="75%">
            <Stop offset="0" stopColor={dark ? '#4a3a30' : '#b07a4f'} />
            <Stop offset="0.6" stopColor={dark ? '#211812' : '#6b4226'} />
            <Stop offset="1" stopColor={dark ? '#0d0907' : '#3d2616'} />
          </RadialGradient>
        </Defs>
        <Rect width={100} height={125} fill={`url(#g${id})`} />
        {Array.from({ length: 16 }).map((_, i) => (
          <Path key={i} d={`M${i * 6.5 + ((seed * 3) % 5)} 0 q 3 30 -1 62 t 1 63`} stroke="#000" strokeOpacity={0.14} strokeWidth={0.8} fill="none" />
        ))}
        {v === 1 ? (
          <G>
            <Path d="M34 22h32l-9 40 9 40H34l9-40z" fill="#2b1a10" />
            <Path d="M38 32h24M38 92h24" stroke="#D62828" strokeWidth={3} />
            <Path d="M45 50h10M45 74h10" stroke="#F4B400" strokeWidth={2} />
          </G>
        ) : (
          <G>
            <Ellipse cx={50} cy={40} rx={18} ry={22} fill={dark ? '#0a0705' : '#4a2d1a'} />
            <Circle cx={43} cy={38} r={5} fill="none" stroke="#F3EFEB" strokeWidth={2} />
            <Circle cx={57} cy={38} r={5} fill="none" stroke="#F3EFEB" strokeWidth={2} />
            <Circle cx={43} cy={38} r={1.8} fill="#D62828" />
            <Circle cx={57} cy={38} r={1.8} fill="#D62828" />
            <Path d="M50 40v14M45 57q5 4 10 0" stroke="#F3EFEB" strokeWidth={1.8} fill="none" strokeLinecap="round" />
            <Path d="M36 66h28l-4 46H40z" fill={dark ? '#0a0705' : '#4a2d1a'} />
            {[72, 80, 88, 96, 104].map((y) => <Path key={y} d={`M40 ${y} l5 -4 l5 4 l5 -4 l5 4`} stroke="#E9D8C2" strokeOpacity={0.6} strokeWidth={1.2} fill="none" />)}
          </G>
        )}
      </>;
    }
    case 'tapa':
      return <>
        <Defs>
          <Pattern id={`t${id}`} patternUnits="userSpaceOnUse" width={25} height={25}>
            <Rect width={25} height={25} fill="#E9D8C2" />
            {v === 1 ? (
              <G stroke="#5E3D24" strokeWidth={2} strokeLinecap="round">
                <Path d="M5 6l3 5M10 6l3 5M14 16l3 5M19 16l3 5" />
              </G>
            ) : (
              <G fill="none" stroke="#5E3D24">
                <Circle cx={12.5} cy={12.5} r={7} strokeWidth={1.6} />
                <Circle cx={12.5} cy={12.5} r={3} strokeWidth={1.2} />
              </G>
            )}
            <Path d="M0 24.2h25" stroke="#8B5E3C" strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width={100} height={125} fill={`url(#t${id})`} />
        <Rect x={0} y={0} width={100} height={125} fill="#D62828" opacity={0.06} />
      </>;
    case 'basket':
      return <>
        <Defs>
          <Pattern id={`k${id}`} patternUnits="userSpaceOnUse" width={12} height={12} patternTransform="rotate(45)">
            <Rect width={12} height={12} fill={v === 1 ? '#D9BB86' : '#C99A5B'} />
            <Rect width={6} height={12} fill={v === 1 ? '#C4A06A' : '#A7783F'} />
            <Rect width={12} height={6} fill="#fff" opacity={0.12} />
          </Pattern>
        </Defs>
        <Rect width={100} height={125} fill={`url(#k${id})`} />
        {v !== 1 && <>
          <Rect y={40} width={100} height={18} fill="#3d2616" opacity={0.85} />
          {[0, 1, 2, 3, 4, 5].map((i) => <Path key={i} d={`M${i * 18 + 2} 49 l7 -6 l7 6 l-7 6z`} fill="#C99A5B" />)}
        </>}
      </>;
    case 'mask': {
      const baining = v === 1;
      return <>
        <Defs>
          <LinearGradient id={`m${id}`} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor="#2b1c12" /><Stop offset="1" stopColor="#4a3020" />
          </LinearGradient>
        </Defs>
        <Rect width={100} height={125} fill={`url(#m${id})`} />
        {baining ? (
          <G>
            <Path d="M50 8 C76 30 78 80 66 116 H34 C22 80 24 30 50 8z" fill="#F3EFEB" />
            <Circle cx={40} cy={58} r={11} fill="#1C1C1C" /><Circle cx={40} cy={58} r={5} fill="#D62828" />
            <Circle cx={60} cy={58} r={11} fill="#1C1C1C" /><Circle cx={60} cy={58} r={5} fill="#D62828" />
            <Path d="M50 18v26M36 92h28M38 100h24" stroke="#1C1C1C" strokeWidth={2.5} />
          </G>
        ) : (
          <G>
            <Ellipse cx={50} cy={62} rx={28} ry={46} fill="#8B5E3C" />
            <Path d="M30 30 L50 20 L70 30M33 38 L50 29 L67 38" stroke="#F4B400" strokeWidth={2.5} fill="none" />
            <Circle cx={39} cy={56} r={8} fill="#F3EFEB" /><Circle cx={39} cy={56} r={4} fill="#1C1C1C" />
            <Circle cx={61} cy={56} r={8} fill="#F3EFEB" /><Circle cx={61} cy={56} r={4} fill="#1C1C1C" />
            <Path d="M50 58 V92" stroke="#3d2616" strokeWidth={5} strokeLinecap="round" />
            <Ellipse cx={50} cy={99} rx={9} ry={3.5} fill="#D62828" />
          </G>
        )}
      </>;
    }
    case 'paint':
      return <>
        <Rect width={100} height={125} fill={v === 1 ? '#3a3a3a' : '#1C1C1C'} />
        {v === 1 ? (
          <G>
            <Ellipse cx={50} cy={58} rx={26} ry={32} fill="#CFC6BD" />
            <Ellipse cx={41} cy={54} rx={6} ry={4} fill="#1C1C1C" /><Ellipse cx={59} cy={54} rx={6} ry={4} fill="#1C1C1C" />
            <Path d="M40 74 q10 6 20 0" stroke="#1C1C1C" strokeWidth={3} fill="none" />
            <Path d="M24 60 C10 90 20 120 30 125 M76 60 C90 90 80 120 70 125" stroke="#8A8078" strokeWidth={6} fill="none" />
          </G>
        ) : (
          <G>
            <Path d="M0 90 L100 40 L100 58 L0 108z" fill="#D62828" />
            <Circle cx={72} cy={28} r={14} fill="#F4B400" />
            {Array.from({ length: 24 }).map((_, i) => <Circle key={i} cx={(i * 37) % 100} cy={10 + ((i * 53) % 110)} r={1.4} fill="#fff" opacity={0.7} />)}
            <Path d="M20 70 q8 -30 16 0 M44 62 q8 -30 16 0" stroke="#F4B400" strokeWidth={2} fill="none" />
          </G>
        )}
      </>;
    case 'shell':
      return <>
        <Defs>
          <RadialGradient id={`s${id}`} cx="50%" cy="60%" r="80%">
            <Stop offset="0" stopColor="#E9D8C2" /><Stop offset="1" stopColor="#8B5E3C" />
          </RadialGradient>
        </Defs>
        <Rect width={100} height={125} fill={`url(#s${id})`} />
        <Path d="M8 30 Q50 95 92 30" stroke="#3d2616" strokeWidth={1.2} fill="none" />
        {Array.from({ length: 11 }).map((_, i) => {
          const tt = i / 10; const x = 8 + 84 * tt; const y = 30 + 130 * tt * (1 - tt) * (v === 1 ? 0.9 : 1);
          return <Ellipse key={i} cx={x} cy={y} rx={v === 1 ? 3 : 4.2} ry={v === 1 ? 3 : 6} fill={i % 3 === 0 ? '#D62828' : '#FFFDF8'} stroke="#3d2616" strokeWidth={0.6} />;
        })}
        {v !== 1 && <Path d="M30 90 q20 18 40 0 q-20 8 -40 0z" fill="#F4B400" stroke="#9A6F00" strokeWidth={0.8} />}
      </>;
    case 'pottery':
      return <>
        <Rect width={100} height={125} fill="#E6E0DA" />
        <Rect y={96} width={100} height={29} fill="#CFC6BD" />
        {v === 1 ? (
          <Path d="M18 66 Q50 112 82 66z" fill="#8B5E3C" />
        ) : (
          <Path d="M32 28 h36 v6 q16 14 16 38 q0 30 -34 30 q-34 0 -34 -30 q0 -24 16 -38z" fill="#8B5E3C" />
        )}
        {[0, 1, 2].map((i) => (
          <Path key={i} d={v === 1 ? `M${26 + i * 2} ${72 + i * 6} q24 ${14 - i * 3} ${48 - i * 4} 0` : `M22 ${62 + i * 10} l7 -5 l7 5 l7 -5 l7 5 l7 -5 l7 5 l7 -5 l7 5`} stroke="#3d2616" strokeWidth={1.5} fill="none" />
        ))}
        {v !== 1 && <><Circle cx={44} cy={50} r={3} fill="#3d2616" /><Circle cx={56} cy={50} r={3} fill="#3d2616" /></>}
      </>;
  }
}
