import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { LogoMark } from '@/components/brand';
import { Button, Card, Header, Input, Row, Screen, T, toast } from '@/components/ui';
import { afterAuth } from '@/lib/auth';
import { useStore } from '@/store';

export default function Login() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const login = useStore((s) => s.login);
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (identifier = id, password = pw) => {
    if (!identifier.trim() || !password) { setError('Enter your email or phone and your password.'); return; }
    setBusy(true);
    const err = await login(identifier, password);
    setBusy(false);
    if (err) { setError(err); return; }
    toast(`Welcome back, ${useStore.getState().me?.name.split(' ')[0] ?? ''}`);
    afterAuth(next);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header />
        <View style={{ paddingHorizontal: 16, gap: 18 }}>
          <LogoMark size={52} />
          <View style={{ gap: 6 }}>
            <T v="h1">Welcome back</T>
            <T color="textSecondary">Log in to buy, save favourites and track orders.</T>
          </View>
          <Input label="Email or phone" value={id} onChangeText={(t) => { setId(t); setError(null); }} placeholder="you@example.com or +675 7…" autoCapitalize="none" keyboardType="email-address" autoComplete="email" left="mail" />
          <Input label="Password" value={pw} onChangeText={(t) => { setPw(t); setError(null); }} placeholder="Your password" secure left="lock" onSubmitEditing={() => submit()} error={error} />
          <Link href="/forgot-password" asChild><Pressable style={{ alignSelf: 'flex-end' }}><T v="label" color="primary">Forgot password?</T></Pressable></Link>
          <Button title="Log in" onPress={() => submit()} loading={busy} />
          <Card style={{ gap: 8 }}>
            <T v="overline" color="heritage">Demo accounts</T>
            <T v="bodySm" color="textSecondary">Demo accounts on the development server. Password for all: tumbuna123</T>
            <Row gap={8}>
              <Button title="Buyer" kind="outline" size="sm" flex onPress={() => submit('kila@example.com', 'tumbuna123')} />
              <Button title="Artist" kind="outline" size="sm" flex onPress={() => submit('joseph@example.com', 'tumbuna123')} />
              <Button title="Admin" kind="outline" size="sm" flex onPress={() => submit('admin@example.com', 'tumbuna123')} />
            </Row>
          </Card>
          <Row style={{ justifyContent: 'center', marginTop: 8 }}>
            <T v="bodySm" color="textSecondary">New here?</T>
            <Pressable onPress={() => router.replace({ pathname: '/register', params: next ? { next } : {} })}><T v="label" color="primary">Create account</T></Pressable>
          </Row>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
