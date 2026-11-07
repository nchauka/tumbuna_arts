import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { CartBar } from '@/components/cart-bar';
import { ArtworkGrid, categoryName, provinceShort } from '@/components/cards';
import { Button, Chip, ChipRow, Empty, Header, PickerSheet, Row, Screen, Sheet, T } from '@/components/ui';
import { categories, materials, provinces, techniques } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { applyFilters, Filters, SORTS } from '@/lib/catalog';
import { useStore } from '@/store';

const PRICE_BANDS = [
  { label: 'Any price', min: undefined, max: undefined },
  { label: 'Under K 200', min: undefined, max: 200 },
  { label: 'K 200 – 500', min: 200, max: 500 },
  { label: 'K 500 – 1,000', min: 500, max: 1000 },
  { label: 'Over K 1,000', min: 1000, max: undefined },
];

export default function Listings() {
  const p = useLocalSearchParams<{ category?: string; province?: string; material?: string; technique?: string; featured?: string; max?: string; verified?: string; nopermit?: string; artist?: string }>();
  const { c } = useTheme();
  const artworks = useStore((s) => s.artworks);
  const artists = useStore((s) => s.artists);
  const [f, setF] = useState<Filters>({
    category: p.category, province: p.province, material: p.material, technique: p.technique, artistId: p.artist,
    featured: p.featured === '1', max: p.max ? Number(p.max) : undefined, verified: p.verified === '1', noPermit: p.nopermit === '1', sort: 'recommended',
  });
  const [sheet, setSheet] = useState<null | 'filter' | 'sort'>(null);
  const items = useMemo(() => applyFilters(artworks, artists, f), [artworks, artists, f]);

  const title = f.featured ? 'Featured artworks' : f.category ? categoryName(f.category) : f.province ? provinceShort(f.province) : f.material ? materials.find((m) => m.slug === f.material)?.name : f.technique ? techniques.find((t) => t.slug === f.technique)?.name : 'All artworks';
  const activeCount = [f.province && !p.province, f.material && !p.material, f.max != null || f.min != null, f.verified, f.noPermit, f.category && !p.category].filter(Boolean).length;

  return (
    <View style={{ flex: 1 }}>
    <Screen padded={false} contentStyle={{ paddingBottom: 90 }} stickyHeaderIndices={[1]}>
      <Header title={title} />
      <View style={{ backgroundColor: c.background, paddingVertical: 10, gap: 10 }}>
        <ChipRow>
          <Chip label={activeCount ? `Filter · ${activeCount}` : 'Filter'} icon="filter" selected={activeCount > 0} onPress={() => setSheet('filter')} />
          <Chip label={SORTS.find((s) => s.value === f.sort)!.label} icon="down" onPress={() => setSheet('sort')} />
          <Chip label="Under K 200" selected={f.max === 200 && f.min == null} onPress={() => setF({ ...f, max: f.max === 200 ? undefined : 200, min: undefined })} />
          <Chip label="Verified only" icon="seal" tone="verified" selected={f.verified} onPress={() => setF({ ...f, verified: !f.verified })} />
          <Chip label="No permit needed" selected={f.noPermit} onPress={() => setF({ ...f, noPermit: !f.noPermit })} />
        </ChipRow>
      </View>
      <T v="caption" color="textMuted" style={{ paddingHorizontal: 16, marginBottom: 12 }}>{items.length} work{items.length === 1 ? '' : 's'}</T>
      {items.length ? <ArtworkGrid items={items} /> : <Empty title="No works match" body="Try removing a filter or widening the price range." action="Clear filters" onAction={() => setF({ sort: f.sort })} />}

    </Screen>
    <CartBar />
      <Sheet visible={sheet === 'filter'} onClose={() => setSheet(null)} title="Filter">
        <View style={{ gap: 18, paddingBottom: 8 }}>
          <FilterGroup title="Category">
            {categories.map((ct) => <Chip key={ct.slug} label={ct.name} selected={f.category === ct.slug} onPress={() => setF({ ...f, category: f.category === ct.slug ? undefined : ct.slug })} />)}
          </FilterGroup>
          <FilterGroup title="Price">
            {PRICE_BANDS.map((b) => <Chip key={b.label} label={b.label} selected={f.min === b.min && f.max === b.max} onPress={() => setF({ ...f, min: b.min, max: b.max })} />)}
          </FilterGroup>
          <FilterGroup title="Province">
            {provinces.filter((pr) => artworks.some((a) => a.province === pr.slug && a.status === 'live')).map((pr) => <Chip key={pr.slug} label={provinceShort(pr.slug)} selected={f.province === pr.slug} onPress={() => setF({ ...f, province: f.province === pr.slug ? undefined : pr.slug })} />)}
          </FilterGroup>
          <FilterGroup title="Material">
            {materials.map((m) => <Chip key={m.slug} label={m.name} selected={f.material === m.slug} onPress={() => setF({ ...f, material: f.material === m.slug ? undefined : m.slug })} />)}
          </FilterGroup>
          <FilterGroup title="Trust & shipping">
            <Chip label="Verified artists only" icon="seal" tone="verified" selected={f.verified} onPress={() => setF({ ...f, verified: !f.verified })} />
            <Chip label="No export permit needed" selected={f.noPermit} onPress={() => setF({ ...f, noPermit: !f.noPermit })} />
          </FilterGroup>
          <Row gap={10}>
            <Button title="Clear all" kind="outline" flex onPress={() => setF({ sort: f.sort })} />
            <Button title={`Show ${items.length}`} flex onPress={() => setSheet(null)} />
          </Row>
        </View>
      </Sheet>
      <PickerSheet visible={sheet === 'sort'} onClose={() => setSheet(null)} title="Sort by" value={f.sort} options={SORTS} onSelect={(v) => setF({ ...f, sort: v })} />
    </View>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <T v="overline" color="textMuted">{title}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}
