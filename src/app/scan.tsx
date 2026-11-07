import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Button, haptic, IconButton, Input, Row, T } from '@/components/ui';
import type { Artwork } from '@/data/types';
import { palette, radius } from '@/constants/tokens';
import { api, ApiError, errorMessage } from '@/lib/api';

type Result = { kind: 'authentic'; art: Artwork; transferred: boolean } | { kind: 'unknown'; code: string } | { kind: 'error'; message: string };

/** Accepts the QR payload (tumbunaarts://certificate/SERIAL), a verify URL, or a bare serial. */
function parseSerial(data: string) {
  const m = data.trim().match(/(TA-COA-[A-Z]{3}-\d{4}-\d{6})/i);
  return m ? m[1].toUpperCase() : null;
}

export default function Scanner() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const busy = useRef(false);
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sweep, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(sweep, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  /** Checks the code against the Tumbuna registry on the server. */
  const check = async (data: string) => {
    if (busy.current) return;
    busy.current = true;
    const serial = parseSerial(data);
    if (!serial) { setResult({ kind: 'unknown', code: data.slice(0, 40) }); haptic('warning'); return; }
    try {
      const cert = await api<{ artwork: Artwork; transferred: boolean }>('GET', `/certificates/${serial}`);
      setResult({ kind: 'authentic', art: cert.artwork, transferred: cert.transferred });
      haptic('success');
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) { setResult({ kind: 'unknown', code: serial }); haptic('warning'); return; }
      setResult({ kind: 'error', message: errorMessage(e) });
    }
  };
  const reset = () => { setResult(null); busy.current = false; };
  const canUseCamera = Platform.OS !== 'web' && permission?.granted;

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0B09' }}>
      {canUseCamera && (
        <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={result ? undefined : ({ data }) => { void check(data); }} />
      )}
      <Row style={{ paddingTop: insets.top + 8, paddingHorizontal: 12 }}>
        <IconButton name="close" label="Close" color="#fff" bg="rgba(255,255,255,0.16)" onPress={() => router.back()} />
        <T v="h3" style={{ color: '#fff', flex: 1, textAlign: 'center' }}>Verify artwork</T>
        {canUseCamera ? <IconButton name="flash" label="Torch" color={torch ? palette.paradiseGold : '#fff'} bg="rgba(255,255,255,0.16)" onPress={() => setTorch(!torch)} /> : <View style={{ width: 40 }} />}
      </Row>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, paddingHorizontal: 24 }}>
        <View style={{ width: 240, height: 240 }}>
          {[{ top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 }].map((s, i) => (
            <View key={i} style={[{ position: 'absolute', width: 44, height: 44, borderColor: palette.paradiseGold, borderRadius: 6 }, s]} />
          ))}
          {!result && (
            <Animated.View style={{ position: 'absolute', left: 16, right: 16, height: 2.5, backgroundColor: palette.kumulRed, shadowColor: palette.kumulRed, shadowOpacity: 1, shadowRadius: 8, top: sweep.interpolate({ inputRange: [0, 1], outputRange: [20, 218] }) }} />
          )}
        </View>
        {!canUseCamera && !result && (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <T center style={{ color: '#E6E0DA' }}>
              {Platform.OS === 'web' ? 'Camera scanning works in the mobile app. Enter the serial printed under the QR code instead.' : 'Allow camera access to scan the QR tag on an artwork.'}
            </T>
            {Platform.OS !== 'web' && permission && !permission.granted && <Button title="Allow camera" onPress={requestPermission} />}
          </View>
        )}
        {canUseCamera && !result && <T center style={{ color: '#E6E0DA' }}>Point at the Tumbuna tag on the artwork</T>}
        {!result && (
          <Pressable onPress={() => setManual(!manual)}><T v="label" style={{ color: palette.paradiseGold }}>{manual ? 'Hide' : 'Enter serial number instead'}</T></Pressable>
        )}
        {manual && !result && (
          <View style={{ width: '100%', gap: 10, backgroundColor: '#fff', borderRadius: radius.lg, padding: 14 }}>
            <Input value={code} onChangeText={setCode} placeholder="TA-COA-ESW-2026-004200" autoCapitalize="characters" />
            <Button title="Check serial" disabled={!code.trim()} onPress={() => { void check(code); }} />
          </View>
        )}
      </View>

      {result && (
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, paddingBottom: insets.bottom + 20, gap: 14 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: palette.sand200, alignSelf: 'center' }} />
          {result.kind === 'authentic' ? <>
            <Row gap={12}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: result.transferred ? palette.paradiseGoldTint : '#E3F2E9', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={result.transferred ? 'seal' : 'check'} size={26} color={result.transferred ? palette.paradiseGold : palette.rainforest} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="h2" style={{ color: palette.ink }}>{result.transferred ? 'Authentic · ownership transferred' : 'Authentic'}</T>
                <T v="bodySm" style={{ color: palette.sand700 }}>{result.art.title}</T>
                <T v="serial" style={{ color: palette.sand500, fontSize: 11 }}>{result.art.certificateSerial}</T>
              </View>
            </Row>
            <Button title="View certificate" onPress={() => router.replace(`/certificate/${result.art.certificateSerial}`)} />
          </> : result.kind === 'error' ? <>
            <Row gap={12}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: palette.paradiseGoldTint, alignItems: 'center', justifyContent: 'center' }}><Icon name="globe" size={24} color={palette.paradiseGoldDeep} /></View>
              <View style={{ flex: 1 }}>
                <T v="h2" style={{ color: palette.ink }}>Couldn&apos;t check this code</T>
                <T v="bodySm" style={{ color: palette.sand700 }}>{result.message}</T>
              </View>
            </Row>
          </> : <>
            <Row gap={12}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: palette.kumulRedTint, alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={24} color={palette.kumulRed} /></View>
              <View style={{ flex: 1 }}>
                <T v="h2" style={{ color: palette.ink }}>Not recognised</T>
                <T v="bodySm" style={{ color: palette.sand700 }}>This code is not on the Tumbuna registry. The item may not be genuine.</T>
              </View>
            </Row>
            <Button title="Report this item" kind="danger" onPress={() => router.replace('/help')} />
          </>}
          <Button title="Scan another" kind="text" onPress={reset} />
        </View>
      )}
    </View>
  );
}
