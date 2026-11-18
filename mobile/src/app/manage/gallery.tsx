import { useState, useMemo } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BedDouble, Eye, Film, Images, Plus, Sparkles, Trash2, UtensilsCrossed } from 'lucide-react-native';
import { galleryApi } from '../../api';
import { asList } from '../../api/client';
import { useAuth } from '../../lib/auth';
import { useData } from '../../lib/query';
import { colors, radius, shadow } from '../../ui/theme';
import { Avatar, Badge, Button, Card, Chips, IconButton, Press, Row, T } from '../../ui/primitives';
import { Choices, Field, Input } from '../../ui/form';
import { Confirm, Empty, ErrorBox, Loading, useToast } from '../../ui/feedback';
import { Appear, Screen } from '../../ui/layout';
import { Sheet } from '../../ui/Sheet';

const CATEGORIES = [
  { value: 'ALL', label: 'All media' },
  { value: 'ROOMS', label: 'Rooms' },
  { value: 'MESS', label: 'Mess & Food' },
  { value: 'BUILDING', label: 'Building' },
  { value: 'COMMON_AREA', label: 'Common Area' },
];

export default function GalleryScreen() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const toast = useToast();
  const mediaQuery = useData(['gallery'], galleryApi.all);
  const [cat, setCat] = useState('ALL');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);

  const items = useMemo(() => {
    const list = asList(mediaQuery.data);
    if (cat === 'ALL') return list;
    return list.filter((m: any) => m.category === cat);
  }, [mediaQuery.data, cat]);

  return (
    <Screen
      title="PG Photos & Videos"
      subtitle={admin ? 'Upload room views and PG tour' : 'Hari Pushp Tower rooms & facilities'}
      back
      tabBar={false}
      onRefresh={mediaQuery.refetch}
      right={admin ? <Button title="Add" icon={Plus} small onPress={() => setAdding(true)} /> : undefined}
    >
      <Chips value={cat} onChange={setCat} options={CATEGORIES} />

      {mediaQuery.error ? (
        <ErrorBox message={(mediaQuery.error as Error).message} onRetry={mediaQuery.refetch} />
      ) : mediaQuery.isLoading ? (
        <Loading rows={3} h={180} />
      ) : items.length === 0 ? (
        <Empty
          icon={Images}
          title="No photos or videos in this category"
          text={admin ? 'Tap "+ Add" to upload room photos or video tours for students.' : 'Photos of this area will be added soon.'}
          action={admin ? <Button title="Add photo or video" icon={Plus} onPress={() => setAdding(true)} /> : undefined}
        />
      ) : (
        items.map((item: any, i: number) => (
          <Appear key={item.id} i={i}>
            <Card style={{ padding: 0, overflow: 'hidden', gap: 0, marginBottom: 14 }}>
              <View style={styles.mediaContainer}>
                <Image
                  source={{ uri: item.url }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <View style={styles.badgeOverlay}>
                  <Badge
                    label={item.mediaType === 'VIDEO' ? 'Video Tour' : item.category}
                    tone={item.mediaType === 'VIDEO' ? 'danger' : 'mint'}
                  />
                </View>
              </View>

              <View style={{ padding: 14, gap: 6 }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <T v="title" w="bold">{item.title}</T>
                    {item.description ? (
                      <T v="caption" c={colors.text2} style={{ marginTop: 2 }}>{item.description}</T>
                    ) : null}
                  </View>
                  {admin && (
                    <IconButton
                      icon={Trash2}
                      label="Delete media"
                      tone="danger"
                      size={34}
                      onPress={() => setDeleting(item)}
                    />
                  )}
                </Row>
              </View>
            </Card>
          </Appear>
        ))
      )}

      {admin && <AddMediaSheet open={adding} onClose={() => setAdding(false)} />}

      <Confirm
        open={!!deleting}
        title="Delete this photo?"
        message="This media will be removed from the hostel tour for all students."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          try {
            await galleryApi.remove(deleting.id);
            toast.success('Media removed');
            await qc.invalidateQueries({ queryKey: ['gallery'] });
          } catch (e: any) {
            toast.error('Could not remove', e.message);
          } finally {
            setDeleting(null);
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </Screen>
  );
}

const AddMediaSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('ROOMS');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || !url.trim()) {
      return setError('Please enter title and image/video URL.');
    }
    setBusy(true);
    setError(null);
    try {
      await galleryApi.add({
        title: title.trim(),
        description: description.trim(),
        category,
        mediaType,
        url: url.trim(),
      });
      toast.success('Media added', 'Students can now view this in the hostel tour.');
      await qc.invalidateQueries({ queryKey: ['gallery'] });
      setTitle('');
      setDescription('');
      setUrl('');
      onClose();
    } catch (e: any) {
      setError(e.message || 'Could not save media.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add PG Photo / Video"
      subtitle="Students see this in their hostel tour"
      footer={<Button title="Save to Gallery" icon={Plus} onPress={submit} loading={busy} full />}
    >
      <Field label="Category">
        <Choices
          pills
          value={category}
          onChange={setCategory}
          options={[
            { value: 'ROOMS', label: 'Rooms' },
            { value: 'MESS', label: 'Mess & Food' },
            { value: 'BUILDING', label: 'Building' },
            { value: 'COMMON_AREA', label: 'Common Area' },
          ]}
        />
      </Field>

      <Field label="Type">
        <Choices
          pills
          value={mediaType}
          onChange={(v: any) => setMediaType(v)}
          options={[
            { value: 'IMAGE', label: 'Photo' },
            { value: 'VIDEO', label: 'Video Tour' },
          ]}
        />
      </Field>

      <Field label="Title" required>
        <Input
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Twin sharing room with balcony"
        />
      </Field>

      <Field label="Media URL" required hint="Direct image or video link (HTTPS)">
        <Input
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          placeholder="https://..."
        />
      </Field>

      <Field label="Description (optional)">
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Spacious with attached washroom and AC"
          multiline
        />
      </Field>

      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  mediaContainer: {
    width: '100%',
    height: 200,
    backgroundColor: colors.bg2,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
});
