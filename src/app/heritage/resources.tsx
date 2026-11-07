import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Card, Header, ListRow, Row, Screen, T } from '@/components/ui';
import { resources } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';

export default function Resources() {
  const { c } = useTheme();
  return (
    <Screen padded={false}>
      <Header title="Heritage resources" />
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        <View>
          <T v="overline" color="heritage">Institutions</T>
          {resources.institutions.map((r, i) => (
            <ListRow key={r.name} icon="globe" title={r.name} subtitle={`${r.place} · ${r.note}`} last={i === resources.institutions.length - 1} onPress={() => WebBrowser.openBrowserAsync(r.url)} />
          ))}
        </View>
        <View style={{ gap: 10 }}>
          <T v="overline" color="heritage">Festival calendar</T>
          {resources.festivals.map((f) => (
            <Row key={f.name} gap={14} style={{ padding: 12, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
              <View style={{ width: 54, alignItems: 'center' }}><T v="label" color="primary">{f.month.slice(0, 3).toUpperCase()}</T></View>
              <View style={{ flex: 1 }}><T v="label">{f.name}</T><T v="caption" color="textMuted">{f.place}</T></View>
            </Row>
          ))}
          <T v="caption" color="textMuted">Dates change each year. Check with the organisers before travelling.</T>
        </View>
        <View style={{ gap: 4 }}>
          <T v="overline" color="heritage">Glossary</T>
          {resources.glossary.map((g, i) => (
            <View key={g.term} style={{ paddingVertical: 10, borderBottomWidth: i === resources.glossary.length - 1 ? 0 : 1, borderBottomColor: c.border }}>
              <T v="label">{g.term}</T><T v="bodySm" color="textSecondary">{g.meaning}</T>
            </View>
          ))}
        </View>
        <Card style={{ gap: 10, backgroundColor: c.heritageTint, borderColor: c.heritageTint }}>
          <Row gap={8}><Icon name="heritage" color={c.heritage} /><T v="h3">Buying with respect</T></Row>
          {resources.protocols.map((p) => <Row key={p} gap={8} style={{ alignItems: 'flex-start' }}><T color="heritage">•</T><T v="bodySm" color="textSecondary" style={{ flex: 1 }}>{p}</T></Row>)}
        </Card>
      </View>
    </Screen>
  );
}
