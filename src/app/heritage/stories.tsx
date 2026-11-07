import { View } from 'react-native';

import { StoryCard } from '@/components/cards';
import { Header, Screen } from '@/components/ui';
import { stories } from '@/data/seed';

export default function Stories() {
  return (
    <Screen padded={false}>
      <Header title="Cultural stories" />
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        {stories.map((s) => <StoryCard key={s.slug} story={s} />)}
      </View>
    </Screen>
  );
}
