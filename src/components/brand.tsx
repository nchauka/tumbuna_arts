import { View } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Polyline, Rect, Text as SvgText, TextPath } from 'react-native-svg';

import { palette } from '@/constants/tokens';

export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Rect width={120} height={120} rx={30} fill={palette.kumulRed} />
      <Path d="M22 40 L31 31 L40 40 L49 31 L58 40 L67 31 L76 40 L85 31 L94 40 L98 36" fill="none" stroke={palette.paradiseGold} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M22 52 L31 43 L40 52 L49 43 L58 52 L67 43 L76 52 L85 43 L94 52 L98 48" fill="none" stroke="#fff" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
      <Path d="M60 58 L69 67 L60 76 L51 67Z" fill="#fff" />
      <Path d="M60 76 L69 85 L60 94 L51 85Z" fill={palette.paradiseGold} />
      <Path d="M60 94 L66 100 L60 106 L54 100Z" fill="#fff" />
    </Svg>
  );
}

/** Signature bilum zigzag band. */
export function BilumBand({ height = 10 }: { height?: number }) {
  return (
    <View style={{ height, width: '100%', overflow: 'hidden' }}>
      <Svg width="100%" height={height}>
        <Defs>
          <Pattern id="bilumband" patternUnits="userSpaceOnUse" width={height * 2} height={height}>
            <Rect width={height * 2} height={height} fill={palette.paradiseGold} />
            <Polyline points={`0,${height} ${height / 2},0 ${height},${height}`} fill={palette.kumulRed} />
            <Polyline points={`${height},0 ${height * 1.5},${height} ${height * 2},0`} fill={palette.ink} />
          </Pattern>
        </Defs>
        <Rect width="100%" height={height} fill="url(#bilumband)" />
      </Svg>
    </View>
  );
}

export function KunduSeal({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs><Path id="sealarc" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" /></Defs>
      <Circle cx={60} cy={60} r={57} fill={palette.paradiseGold} />
      <Circle cx={60} cy={60} r={35} fill={palette.paradiseGoldTint} stroke={palette.ink} strokeWidth={2} />
      {size >= 56 && (
        <SvgText fontSize={8.4} fill={palette.ink} letterSpacing={1.2} fontWeight="600">
          <TextPath href="#sealarc">AUTHENTIC · TUMBUNA ARTS · PAPUA NEW GUINEA ·</TextPath>
        </SvgText>
      )}
      <Path d="M48 40h24l-7 20 7 20H48l7-20z" fill={palette.ink} />
      <Path d="M52 47h16M52 73h16" stroke={palette.kumulRed} strokeWidth={3} />
    </Svg>
  );
}

export function FaceMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Rect width={120} height={120} rx={30} fill={palette.ink} />
      <Path d="M60 22 a28 42 0 1 0 0.1 0z" fill={palette.earth} />
      <Path d="M42 34 L60 25 L78 34M45 42 L60 34 L75 42" fill="none" stroke={palette.paradiseGold} strokeWidth={4} strokeLinejoin="round" />
      <Circle cx={49} cy={60} r={8} fill="none" stroke="#F3EFEB" strokeWidth={3.5} /><Circle cx={49} cy={60} r={3} fill={palette.kumulRed} />
      <Circle cx={71} cy={60} r={8} fill="none" stroke="#F3EFEB" strokeWidth={3.5} /><Circle cx={71} cy={60} r={3} fill={palette.kumulRed} />
      <Path d="M60 56 V82M53 84 Q60 91 67 84" fill="none" stroke="#F3EFEB" strokeWidth={3.5} strokeLinecap="round" />
    </Svg>
  );
}
