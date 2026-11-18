import { useState, useMemo } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BedDouble, Camera, Check, Eye, Film, Image as ImageIcon, Images, Plus, Sparkles, Trash2, Upload, UtensilsCrossed } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
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
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'VIDEO' ? ['videos'] : ['images'],
        allowsEditing: mediaType === 'IMAGE',
        quality: 0.8,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        setSelectedAsset(res.assets[0]);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'Could not access phone gallery.');
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      return setError('Please enter a title for the media.');
    }
    if (!selectedAsset) {
      return setError('Please choose a photo or video from your phone gallery.');
    }

    setBusy(true);
    setError(null);
    try {
      let fileData: string | undefined = undefined;
      if (selectedAsset) {
        if (selectedAsset.base64) {
          const mime = selectedAsset.mimeType || (mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg');
          fileData = `data:${mime};base64,${selectedAsset.base64}`;
        } else {
          fileData = selectedAsset.uri;
        }
      }

      await galleryApi.add({
        title: title.trim(),
        description: description.trim(),
        category,
        mediaType,
        fileData,
      });

      toast.success('Uploaded successfully', 'The photo/video is now visible in the hostel tour.');
      await qc.invalidateQueries({ queryKey: ['gallery'] });
      setTitle('');
      setDescription('');
      setSelectedAsset(null);
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
      subtitle="Upload views directly from phone gallery"
      footer={<Button title={busy ? 'Uploading…' : 'Save to Gallery'} icon={Plus} onPress={submit} loading={busy} full />}
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
          onChange={(v: any) => { setMediaType(v); setSelectedAsset(null); }}
          options={[
            { value: 'IMAGE', label: 'Photo' },
            { value: 'VIDEO', label: 'Video Tour' },
          ]}
        />
      </Field>

      <Field label="Media from Gallery" required>
        {selectedAsset ? (
          <View style={{ gap: 8 }}>
            <View style={{ width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bgTertiary }}>
              <Image source={{ uri: selectedAsset.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <Button
              title="Choose a different photo"
              icon={Camera}
              kind="secondary"
              small
              onPress={pickFromGallery}
            />
          </View>
        ) : (
          <Press
            onPress={pickFromGallery}
            scaleTo={0.98}
            style={{
              padding: 20,
              borderRadius: 14,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: colors.brand300,
              backgroundColor: colors.mint50,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={24} color={colors.brand700} />
            </View>
            <T v="title" w="bold" c={colors.brand700}>
              Choose from Phone Gallery
            </T>
            <T v="caption" c={colors.text3}>
              Tap to pick {mediaType === 'VIDEO' ? 'a video tour' : 'a photo'} from your device
            </T>
          </Press>
        )}
      </Field>

      <Field label="Title" required>
        <Input
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Twin sharing room with balcony"
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
    backgroundColor: colors.bgTertiary,
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
