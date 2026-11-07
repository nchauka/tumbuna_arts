import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Platform, Pressable, ScrollView, ScrollViewProps, StyleProp, Switch, Text, TextInput, TextInputProps,
  TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { Icon, IconName } from '@/components/icon';
import { elevation, layout, radius, space, typography } from '@/constants/tokens';
import { Palette, useTheme } from '@/hooks/use-theme';

export const haptic = (kind: 'light' | 'success' | 'warning' = 'light') => {
  if (Platform.OS === 'web') return;
  if (kind === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else void Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
};

// ——— Text ———
type Variant = keyof typeof typography;
type TProps = TextProps & { v?: Variant; color?: keyof Palette; style?: StyleProp<TextStyle>; center?: boolean };
export function T({ v = 'body', color = 'text', style, center, ...rest }: TProps) {
  const { c } = useTheme();
  return <Text {...rest} style={[typography[v] as TextStyle, { color: c[color] }, center && { textAlign: 'center' }, style]} />;
}

// ——— Buttons ———
type BtnKind = 'primary' | 'dark' | 'outline' | 'text' | 'danger';
type BtnProps = {
  title: string; onPress?: () => void; kind?: BtnKind; icon?: IconName; disabled?: boolean; loading?: boolean;
  style?: StyleProp<ViewStyle>; size?: 'md' | 'sm'; flex?: boolean;
};
export function Button({ title, onPress, kind = 'primary', icon, disabled, loading, style, size = 'md', flex }: BtnProps) {
  const { c } = useTheme();
  const bg = { primary: c.primary, dark: c.text, outline: 'transparent', text: 'transparent', danger: c.error }[kind];
  const fg = { primary: c.onPrimary, dark: c.background, outline: c.text, text: c.primary, danger: '#fff' }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={() => { haptic(); onPress?.(); }}
      style={({ pressed }) => [{
        backgroundColor: bg, borderRadius: radius.lg, minHeight: size === 'md' ? 52 : 38, paddingHorizontal: size === 'md' ? 22 : 14,
        alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
        borderWidth: kind === 'outline' ? 1.5 : 0, borderColor: c.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }, flex && { flex: 1 }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <>
        {icon && <Icon name={icon} size={size === 'md' ? 20 : 16} color={fg} />}
        <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: size === 'md' ? 15 : 13, color: fg }}>{title}</Text>
      </>}
    </Pressable>
  );
}

export function IconButton({ name, onPress, badge, color, bg, size = 40, label, fill }: { name: IconName; onPress?: () => void; badge?: number; color?: string; bg?: string; size?: number; label: string; fill?: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={() => { haptic(); onPress?.(); }}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: bg ?? 'transparent', opacity: pressed ? 0.6 : 1 })}>
      <Icon name={name} color={color ?? c.text} fill={fill} />
      {!!badge && (
        <View style={{ position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
          <Text style={{ color: '#fff', fontFamily: 'Manrope_800ExtraBold', fontSize: 10 }}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ——— Chips & badges ———
export function Chip({ label, selected, onPress, icon, tone }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; tone?: 'heritage' | 'primary' | 'verified' }) {
  const { c } = useTheme();
  const toneBg = tone === 'heritage' ? c.heritageTint : tone === 'primary' ? c.primaryTint : tone === 'verified' ? c.verifiedTint : c.element;
  const toneFg = tone === 'heritage' ? c.heritage : tone === 'primary' ? c.primary : tone === 'verified' ? c.verifiedText : c.text;
  return (
    <Pressable onPress={onPress && (() => { haptic(); onPress(); })} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityState={{ selected: !!selected }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: radius.pill, backgroundColor: selected ? c.text : toneBg }}>
      {icon && <Icon name={icon} size={14} color={selected ? c.background : toneFg} />}
      <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 13, color: selected ? c.background : toneFg }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: 8, paddingHorizontal: space.md }, style]}>{children}</ScrollView>;
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'verified' | 'heritage' | 'dark' }) {
  const { c } = useTheme();
  const map = {
    neutral: [c.element, c.textSecondary], success: [c.success + '22', c.success], warning: [c.verifiedTint, c.verifiedText],
    danger: [c.primaryTint, c.primary], verified: [c.verifiedTint, c.verifiedText], heritage: [c.heritageTint, c.heritage], dark: [c.text, c.background],
  }[tone];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: map[0], borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ fontFamily: 'Manrope_800ExtraBold', fontSize: 11, color: map[1] }}>{label}</Text>
    </View>
  );
}

export function Seal({ size = 16 }: { size?: number }) {
  const { c } = useTheme();
  return <Icon name="seal" size={size} color={c.verified} />;
}

// ——— Inputs ———
type InputProps = TextInputProps & { label?: string; error?: string | null; hint?: string; secure?: boolean; left?: IconName; right?: ReactNode };
export function Input({ label, error, hint, secure, left, right, style, multiline, ...rest }: InputProps) {
  const { c } = useTheme();
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={{ gap: 6 }}>
      {label && <T v="label">{label}</T>}
      <View style={{
        flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', gap: 8, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: 14,
        borderColor: error ? c.error : focus ? c.primary : c.border, backgroundColor: c.background, minHeight: multiline ? 110 : 50,
      }}>
        {left && <Icon name={left} size={18} color={c.textMuted} />}
        <TextInput
          placeholderTextColor={c.textMuted}
          secureTextEntry={hidden}
          onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
          multiline={multiline}
          {...rest}
          style={[{ flex: 1, color: c.text, fontFamily: 'Manrope_500Medium', fontSize: 16, paddingVertical: multiline ? 12 : 0, minHeight: multiline ? 100 : 46, textAlignVertical: multiline ? 'top' : 'center' }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object), style]}
        />
        {secure && <IconButton label={hidden ? 'Show password' : 'Hide password'} name={hidden ? 'eye' : 'eyeOff'} size={32} color={c.textMuted} onPress={() => setHidden(!hidden)} />}
        {right}
      </View>
      {error ? <T v="caption" color="error">{error}</T> : hint ? <T v="caption" color="textMuted">{hint}</T> : null}
    </View>
  );
}

export function Select({ label, value, placeholder, onPress }: { label?: string; value?: string; placeholder?: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && <T v="label">{label}</T>}
      <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 50, borderWidth: 1.5, borderColor: c.border, borderRadius: radius.md, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T style={{ flex: 1 }} color={value ? 'text' : 'textMuted'} numberOfLines={1}>{value || placeholder}</T>
        <Icon name="down" size={18} color={c.textMuted} />
      </Pressable>
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return <Switch value={value} onValueChange={(v) => { haptic(); onChange(v); }} trackColor={{ true: c.primary, false: c.border }} thumbColor="#fff" />;
}

// ——— Layout ———
export function Screen({ children, scroll = true, padded = true, style, contentStyle, footer, overlay, bg, edges = 'top', ...rest }:
  { children: ReactNode; scroll?: boolean; padded?: boolean; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>; footer?: ReactNode; overlay?: ReactNode; bg?: keyof Palette; edges?: 'top' | 'none' } & ScrollViewProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const pad = padded ? { paddingHorizontal: layout.screenGutter } : null;
  return (
    <View style={[{ flex: 1, backgroundColor: c[bg ?? 'background'], paddingTop: edges === 'top' ? insets.top : 0 }, style]}>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[pad, { paddingBottom: footer ? 24 : 40 }, contentStyle]} {...rest}>{children}</ScrollView>
      ) : <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>}
      {footer && <StickyFooter>{footer}</StickyFooter>}
      {overlay}
    </View>
  );
}

export function StickyFooter({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ paddingHorizontal: space.md, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: c.background, borderTopWidth: 1, borderTopColor: c.border, flexDirection: 'row', gap: 10 }, elevation.e2]}>
      {children}
    </View>
  );
}

export function Header({ title, right, back = true, transparent, onBack, large }: { title?: string; right?: ReactNode; back?: boolean; transparent?: boolean; onBack?: () => void; large?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ height: layout.headerHeight, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, backgroundColor: transparent ? 'transparent' : c.background }}>
      <View style={{ width: 88, alignItems: 'flex-start' }}>
        {back && <IconButton label="Back" name="back" onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/home')))} />}
      </View>
      <T v={large ? 'h2' : 'h3'} numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>{title}</T>
      <View style={{ width: 88, flexDirection: 'row', justifyContent: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function Section({ title, action, onAction, children, style }: { title: string; action?: string; onAction?: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: space.xxl, gap: 12 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: space.md }}>
        <T v="h2" style={{ flex: 1, fontSize: 20 }}>{title}</T>
        {action && <Pressable onPress={onAction} hitSlop={8}><T v="label" color="primary">{action}</T></Pressable>}
      </View>
      {children}
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.element, borderRadius: radius.pill, padding: 4 }}>
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => { haptic(); onChange(o.key); }} accessibilityRole="tab" accessibilityState={{ selected: value === o.key }}
          style={{ flex: 1, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: value === o.key ? c.text : 'transparent' }}>
          <Text style={{ fontFamily: 'Manrope_700Bold', fontSize: 13, color: value === o.key ? c.background : c.textSecondary }}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Tabs<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: c.border }}>
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="tab" accessibilityState={{ selected: value === o.key }}
          style={{ paddingVertical: 10, borderBottomWidth: 2.5, borderBottomColor: value === o.key ? c.primary : 'transparent', marginBottom: -1 }}>
          <T v="label" color={value === o.key ? 'text' : 'textMuted'}>{o.label}</T>
        </Pressable>
      ))}
    </View>
  );
}

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {steps.map((s, i) => (
        <View key={s} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
            <View style={{ flex: 1, height: 2, backgroundColor: i === 0 ? 'transparent' : i <= current ? c.success : c.border }} />
            <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: i < current ? c.success : i === current ? c.primary : c.element }}>
              {i < current ? <Icon name="check" size={16} color="#fff" /> : <Text style={{ color: i === current ? '#fff' : c.textMuted, fontFamily: 'Manrope_800ExtraBold', fontSize: 12 }}>{i + 1}</Text>}
            </View>
            <View style={{ flex: 1, height: 2, backgroundColor: i === steps.length - 1 ? 'transparent' : i < current ? c.success : c.border }} />
          </View>
          <T v="caption" color={i === current ? 'text' : 'textMuted'} style={{ fontFamily: 'Manrope_700Bold' }}>{s}</T>
        </View>
      ))}
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const { c } = useTheme();
  return <View style={{ height: 4, borderRadius: 2, backgroundColor: c.element }}><View style={{ width: `${Math.min(100, value * 100)}%`, height: 4, borderRadius: 2, backgroundColor: c.primary }} /></View>;
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const { c } = useTheme();
  const base = [{ backgroundColor: c.surfaceRaised, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: c.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }]}>{children}</Pressable>;
}

export function ListRow({ icon, title, subtitle, right, onPress, danger, last }: { icon?: IconName; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; danger?: boolean; last?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border, opacity: pressed ? 0.6 : 1 })}>
      {icon && <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: danger ? c.primaryTint : c.element, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={18} color={danger ? c.primary : c.text} /></View>}
      <View style={{ flex: 1 }}>
        <T v="bodyStrong" color={danger ? 'primary' : 'text'}>{title}</T>
        {subtitle && <T v="bodySm" color="textMuted">{subtitle}</T>}
      </View>
      {right ?? (onPress ? <Icon name="chev" size={18} color={c.textMuted} /> : null)}
    </Pressable>
  );
}

export function StatTile({ value, label, sub, subTone }: { value: string; label: string; sub?: string; subTone?: 'success' | 'muted' }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.surfaceRaised, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: c.border, gap: 2 }}>
      <T v="price" style={{ fontSize: 18 }}>{value}</T>
      <T v="caption" color="textMuted">{label}</T>
      {sub && <T v="caption" color={subTone === 'success' ? 'success' : 'textMuted'} style={{ fontFamily: 'Manrope_700Bold' }}>{sub}</T>}
    </View>
  );
}

export function Empty({ icon = 'leaf', title, body, action, onAction }: { icon?: IconName; title: string; body?: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.heritageTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={30} color={c.heritage} />
      </View>
      <T v="h3" center>{title}</T>
      {body && <T v="bodySm" color="textMuted" center style={{ maxWidth: 300 }}>{body}</T>}
      {action && <Button title={action} onPress={onAction} size="sm" style={{ marginTop: 8 }} />}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ height: 1, backgroundColor: c.border }, style]} />;
}

export function Row({ children, gap = 8, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

// ——— Bottom sheet / picker ———
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <View style={{ position: 'absolute', inset: 0, zIndex: 50, justifyContent: 'flex-end' } as ViewStyle}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }} />
      <View style={[{ backgroundColor: c.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: 10, paddingBottom: insets.bottom + 16, maxHeight: '85%' }, elevation.e3]}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 8 }} />
        {title && <Row style={{ paddingHorizontal: 16, paddingBottom: 8 }}><T v="h3" style={{ flex: 1 }}>{title}</T><IconButton name="close" label="Close" onPress={onClose} /></Row>}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </View>
  );
}

export function PickerSheet<V extends string>({ visible, onClose, title, options, value, onSelect }: { visible: boolean; onClose: () => void; title: string; options: { value: V; label: string; sub?: string }[]; value?: V; onSelect: (v: V) => void }) {
  const { c } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {options.map((o, i) => (
        <ListRow key={o.value} title={o.label} subtitle={o.sub} last={i === options.length - 1} onPress={() => { onSelect(o.value); onClose(); }}
          right={value === o.value ? <Icon name="check" size={20} color={c.primary} /> : <View />} />
      ))}
    </Sheet>
  );
}

// ——— Toast ———
const useToast = create<{ msg: string | null; key: number; show: (m: string) => void }>((set) => ({ msg: null, key: 0, show: (msg) => set((s) => ({ msg, key: s.key + 1 })) }));
export const toast = (m: string) => useToast.getState().show(m);

/** Awaits a store action that resolves to an error message or null; toasts the outcome. Returns true on success. */
export async function act(p: Promise<string | null>, success?: string) {
  const err = await p;
  if (err) { haptic('warning'); toast(err); return false; }
  if (success) toast(success);
  return true;
}

export function ToastHost() {
  const { msg, key } = useToast();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!msg) return;
    Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(2200),
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [key, msg, anim]);
  if (!msg) return null;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, top: insets.top + 8, zIndex: 100, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }}>
      <View style={[{ backgroundColor: c.text, borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', gap: 10, alignItems: 'center' }, elevation.e3]}>
        <Icon name="check" size={18} color={c.verified} />
        <Text style={{ color: c.background, fontFamily: 'Manrope_700Bold', fontSize: 14, flex: 1 }}>{msg}</Text>
      </View>
    </Animated.View>
  );
}

// ——— Confirm dialog (Alert does not work on web) ———
type ConfirmOpts = { title: string; body?: string; confirm: string; danger?: boolean; onConfirm: () => void };
const useConfirm = create<{ opts: ConfirmOpts | null; open: (o: ConfirmOpts) => void; close: () => void }>((set) => ({
  opts: null, open: (opts) => set({ opts }), close: () => set({ opts: null }),
}));
export const confirm = (o: ConfirmOpts) => useConfirm.getState().open(o);

export function ConfirmHost() {
  const { opts, close } = useConfirm();
  const { c } = useTheme();
  if (!opts) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.overlay }} onPress={close} />
      <View style={[{ backgroundColor: c.background, borderRadius: radius.xl, padding: 22, width: '100%', maxWidth: 380, gap: 10 }, elevation.e3]}>
        <T v="h3">{opts.title}</T>
        {opts.body && <T v="bodySm" color="textSecondary">{opts.body}</T>}
        <Row style={{ marginTop: 10 }} gap={10}>
          <Button title="Cancel" kind="outline" flex onPress={close} />
          <Button title={opts.confirm} kind={opts.danger ? 'danger' : 'primary'} flex onPress={() => { close(); opts.onConfirm(); }} />
        </Row>
      </View>
    </View>
  );
}
