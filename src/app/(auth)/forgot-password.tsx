import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Card, Header, Input, Screen, T, toast } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/store';

export default function ForgotPassword() {
  const { c } = useTheme();
  const requestReset = useStore((s) => s.requestPasswordReset);
  const resetPassword = useStore((s) => s.resetPassword);
  const [step, setStep] = useState<'id' | 'code'>('id');
  const [id, setId] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const masked = id.includes('@') ? id.replace(/^(.).*(@.*)$/, '$1•••$2') : id.replace(/\d(?=\d{2})/g, '•');

  const send = async () => {
    setBusy(true);
    const r = await requestReset(id);
    setBusy(false);
    if (r.error) return setError(r.error);
    setDevCode(r.devCode);
    setTimer(60); setError(null); setStep('code');
  };

  const confirm = async () => {
    setBusy(true);
    const err = await resetPassword(id, code, pw);
    setBusy(false);
    if (err) return setError(err);
    toast('Password updated. Log in with your new password.');
    router.replace('/login');
  };

  return (
    <Screen padded={false}>
      <Header />
      <View style={{ paddingHorizontal: 16, gap: 18 }}>
        {step === 'id' && <>
          <T v="h1">Reset your password</T>
          <T color="textSecondary">Enter the email or phone number on your account. We&apos;ll send a 6-digit code.</T>
          <Input label="Email or phone" value={id} onChangeText={(t) => { setId(t); setError(null); }} autoCapitalize="none" keyboardType="email-address" error={error} />
          <Button title="Send reset code" onPress={send} loading={busy} disabled={!id.trim()} />
        </>}
        {step === 'code' && <>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.success + '22', alignItems: 'center', justifyContent: 'center' }}><Icon name="mail" size={28} color={c.success} /></View>
          <T v="h1">Check your messages</T>
          <T color="textSecondary">If an account uses {masked}, we sent it a code. It expires in 15 minutes.</T>
          {devCode && <Card style={{ backgroundColor: c.verifiedTint, borderColor: c.verifiedTint }}><T v="bodySm">Development server: your code is <T v="serial">{devCode}</T></T></Card>}
          <Input label="6-digit code" value={code} onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, 6)); setError(null); }} keyboardType="number-pad" />
          <Input label="New password" value={pw} onChangeText={(t) => { setPw(t); setError(null); }} secure placeholder="At least 8 characters" error={error} />
          <Button title="Update password" disabled={code.length !== 6 || pw.length < 8} loading={busy} onPress={confirm} />
          <Button title={timer > 0 ? `Resend code in ${timer}s` : 'Resend code'} kind="text" disabled={timer > 0} onPress={send} />
        </>}
      </View>
    </Screen>
  );
}
