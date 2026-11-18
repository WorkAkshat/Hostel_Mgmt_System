import { useState, useMemo } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { BedDouble, Camera, Check, Edit3, Eye, Film, FolderPlus, Image as ImageIcon, Images, Pencil, Plus, Settings2, Sparkles, Tag, Trash2, Upload, UtensilsCrossed } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { galleryApi } from '../api';
import { asList } from '../api/client';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/query';
import { colors, radius, shadow } from '../ui/theme';
import { Avatar, Badge, Button, Card, Chips, IconButton, Press, Row, T } from '../ui/primitives';
import { Choices, Field, Input } from '../ui/form';
import { Confirm, Empty, ErrorBox, Loading, useToast } from '../ui/feedback';
import { Appear, Screen } from '../ui/layout';
import { Sheet } from '../ui/Sheet';

const DEFAULT_CATEGORIES = [
  { value: 'ROOMS', label: 'Rooms' },
  { value: 'MESS', label: 'Mess & Food' },
  { value: 'BUILDING', label: 'Building' },
  { value: 'COMMON_AREA', label: 'Common Area' },
];

const DEFAULT_TYPES = [
  { value: 'IMAGE', label: 'Photo' },
  { value: 'VIDEO', label: 'Video Tour' },
];

export default function GalleryScreen() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const toast = useToast();
  const mediaQuery = useData(['gallery'], galleryApi.all);
  const metaQuery = useData(['gallery-meta'], galleryApi.meta);

  const [cat, setCat] = useState('ALL');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [manageMeta, setManageMeta] = useState(false);

  const categories = useMemo(() => {
    const list = metaQuery.data?.categories || DEFAULT_CATEGORIES;
    return list;
  }, [metaQuery.data]);

  const catOptions = useMemo(() => {
    return [{ value: 'ALL', label: 'All media' }, ...categories];
  }, [categories]);

  const types = useMemo(() => {
    return metaQuery.data?.types || DEFAULT_TYPES;
  }, [metaQuery.data]);

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
      onRefresh={async () => { await Promise.all([mediaQuery.refetch(), metaQuery.refetch()]); }}
      right={
        admin ? (
          <Row gap={6}>
            <IconButton icon={Settings2} label="Manage categories & types" tone="mint" size={36} onPress={() => setManageMeta(true)} />
            <Button title="Add" icon={Plus} small onPress={() => setAdding(true)} />
          </Row>
        ) : undefined
      }
    >
      <View style={{ gap: 8 }}>
        <Chips value={cat} onChange={setCat} options={catOptions} />
      </View>

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
        items.map((item: any, i: number) => {
          const catLabel = categories.find((c: any) => c.value === item.category)?.label || item.category;
          const typeLabel = types.find((t: any) => t.value === item.mediaType)?.label || (item.mediaType === 'VIDEO' ? 'Video Tour' : 'Photo');
          return (
            <Appear key={item.id} i={i}>
              <Card style={{ padding: 0, overflow: 'hidden', gap: 0, marginBottom: 14 }}>
                <Press onPress={() => setViewing(item)} scaleTo={0.99}>
                  <View style={styles.mediaContainer}>
                    <Image
                      source={{ uri: item.url }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                    <View style={styles.badgeOverlay}>
                      <Badge
                        label={item.mediaType === 'VIDEO' ? typeLabel : catLabel}
                        tone={item.mediaType === 'VIDEO' ? 'danger' : 'mint'}
                      />
                    </View>
                  </View>
                </Press>

                <View style={{ padding: 14, gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Row gap={6} align="center" style={{ marginBottom: 2 }}>
                        <T v="title" w="bold">{item.title}</T>
                      </Row>
                      <Row gap={6} align="center" style={{ flexWrap: 'wrap' }}>
                        <T v="caption" c={colors.brand700} w="semibold">{catLabel}</T>
                        <T v="caption" c={colors.text3}>•</T>
                        <T v="caption" c={colors.text3}>{typeLabel}</T>
                      </Row>
                      {item.description ? (
                        <T v="caption" c={colors.text2} style={{ marginTop: 4 }}>{item.description}</T>
                      ) : null}
                    </View>
                    {admin && (
                      <Row gap={4}>
                        <IconButton
                          icon={Pencil}
                          label="Edit category or type"
                          tone="mint"
                          size={34}
                          onPress={() => setEditing(item)}
                        />
                        <IconButton
                          icon={Trash2}
                          label="Delete media"
                          tone="danger"
                          size={34}
                          onPress={() => setDeleting(item)}
                        />
                      </Row>
                    )}
                  </Row>
                </View>
              </Card>
            </Appear>
          );
        })
      )}

      {admin && (
        <AddMediaSheet
          open={adding}
          categories={categories}
          types={types}
          onClose={() => setAdding(false)}
        />
      )}

      {admin && editing && (
        <EditMediaSheet
          open={!!editing}
          item={editing}
          categories={categories}
          types={types}
          onClose={() => setEditing(null)}
        />
      )}

      {admin && (
        <ManageMetaSheet
          open={manageMeta}
          categories={categories}
          types={types}
          onClose={() => setManageMeta(false)}
        />
      )}

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

      {viewing && (
        <Sheet
          open={!!viewing}
          onClose={() => setViewing(null)}
          title={viewing.title}
          subtitle={categories.find((c: any) => c.value === viewing.category)?.label || viewing.category}
          footer={viewing.mediaType === 'VIDEO' ? <Button title="Play Video Tour" icon={Film} onPress={() => Linking.openURL(viewing.url)} full /> : undefined}
        >
          <View style={{ width: '100%', height: 260, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.bgTertiary, marginBottom: 12 }}>
            <Image source={{ uri: viewing.url }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          </View>
          {viewing.description ? (
            <T c={colors.text2} style={{ lineHeight: 20 }}>{viewing.description}</T>
          ) : null}
        </Sheet>
      )}
    </Screen>
  );
}

// ── Add Media Sheet ──
const AddMediaSheet = ({
  open,
  categories,
  types,
  onClose
}: {
  open: boolean;
  categories: { value: string; label: string }[];
  types: { value: string; label: string }[];
  onClose: () => void;
}) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0]?.value || 'ROOMS');
  const [mediaType, setMediaType] = useState(types[0]?.value || 'IMAGE');
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick new category & type inline input
  const [newCatInput, setNewCatInput] = useState('');
  const [addingCat, setAddingCat] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');
  const [addingType, setAddingType] = useState(false);

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

  const saveNewCategory = async () => {
    if (!newCatInput.trim()) return;
    try {
      const res = await galleryApi.addCategory(newCatInput.trim());
      await qc.invalidateQueries({ queryKey: ['gallery-meta'] });
      setCategory(res.value || newCatInput.trim().toUpperCase());
      setNewCatInput('');
      setAddingCat(false);
      toast.success('Category added');
    } catch (e: any) {
      setError(e.message || 'Could not add category');
    }
  };

  const saveNewType = async () => {
    if (!newTypeInput.trim()) return;
    try {
      const res = await galleryApi.addType(newTypeInput.trim());
      await qc.invalidateQueries({ queryKey: ['gallery-meta'] });
      setMediaType(res.value || newTypeInput.trim().toUpperCase());
      setNewTypeInput('');
      setAddingType(false);
      toast.success('Media type added');
    } catch (e: any) {
      setError(e.message || 'Could not add media type');
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
          options={categories}
        />
        {addingCat ? (
          <Row gap={8} style={{ marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Input
                value={newCatInput}
                onChangeText={setNewCatInput}
                placeholder="e.g. Library, Terrace, Gym"
              />
            </View>
            <Button title="Save" small onPress={saveNewCategory} />
            <Button title="Cancel" kind="secondary" small onPress={() => setAddingCat(false)} />
          </Row>
        ) : (
          <Press onPress={() => setAddingCat(true)} style={{ marginTop: 6 }}>
            <T v="caption" c={colors.brand700} w="semibold">+ Add new category</T>
          </Press>
        )}
      </Field>

      <Field label="Media Type">
        <Choices
          pills
          value={mediaType}
          onChange={(v: any) => { setMediaType(v); setSelectedAsset(null); }}
          options={types}
        />
        {addingType ? (
          <Row gap={8} style={{ marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Input
                value={newTypeInput}
                onChangeText={setNewTypeInput}
                placeholder="e.g. 360 View, Floor Plan"
              />
            </View>
            <Button title="Save" small onPress={saveNewType} />
            <Button title="Cancel" kind="secondary" small onPress={() => setAddingType(false)} />
          </Row>
        ) : (
          <Press onPress={() => setAddingType(true)} style={{ marginTop: 6 }}>
            <T v="caption" c={colors.brand700} w="semibold">+ Add new type</T>
          </Press>
        )}
      </Field>

      <Field label="Media from Gallery" required>
        {selectedAsset ? (
          <View style={{ gap: 8 }}>
            <View style={{ width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bgTertiary }}>
              <Image source={{ uri: selectedAsset.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
            <Button
              title="Choose a different file"
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

// ── Edit Media Sheet (Change Category & Type on a Photo) ──
const EditMediaSheet = ({
  open,
  item,
  categories,
  types,
  onClose
}: {
  open: boolean;
  item: any;
  categories: { value: string; label: string }[];
  types: { value: string; label: string }[];
  onClose: () => void;
}) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [category, setCategory] = useState(item?.category || categories[0]?.value);
  const [mediaType, setMediaType] = useState(item?.mediaType || types[0]?.value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveChanges = async () => {
    if (!title.trim()) return setError('Title cannot be empty');
    setBusy(true);
    setError(null);
    try {
      await galleryApi.update(item.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        mediaType,
      });
      toast.success('Updated successfully', 'Photo details updated');
      await qc.invalidateQueries({ queryKey: ['gallery'] });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Could not update photo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit Photo Category & Type"
      subtitle="Change category, type or details for this photo"
      footer={<Button title={busy ? 'Saving…' : 'Save Changes'} icon={Check} onPress={saveChanges} loading={busy} full />}
    >
      <View style={{ width: '100%', height: 120, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bgTertiary, marginBottom: 12 }}>
        <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>

      <Field label="Category">
        <Choices
          pills
          value={category}
          onChange={setCategory}
          options={categories}
        />
      </Field>

      <Field label="Type">
        <Choices
          pills
          value={mediaType}
          onChange={setMediaType}
          options={types}
        />
      </Field>

      <Field label="Title" required>
        <Input value={title} onChangeText={setTitle} placeholder="Title" />
      </Field>

      <Field label="Description (optional)">
        <Input value={description} onChangeText={setDescription} placeholder="Description" multiline />
      </Field>

      {error && <ErrorBox message={error} />}
    </Sheet>
  );
};

// ── Manage Categories & Types Sheet ──
const ManageMetaSheet = ({
  open,
  categories,
  types,
  onClose
}: {
  open: boolean;
  categories: { value: string; label: string }[];
  types: { value: string; label: string }[];
  onClose: () => void;
}) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [newCat, setNewCat] = useState('');
  const [newType, setNewType] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddCat = async () => {
    if (!newCat.trim()) return;
    setBusy(true);
    try {
      await galleryApi.addCategory(newCat.trim());
      await qc.invalidateQueries({ queryKey: ['gallery-meta'] });
      setNewCat('');
      toast.success('Category added');
    } catch (e: any) {
      setError(e.message || 'Could not add category');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCat = async (val: string) => {
    try {
      await galleryApi.removeCategory(val);
      await qc.invalidateQueries({ queryKey: ['gallery-meta'] });
      toast.success('Category removed');
    } catch (e: any) {
      setError(e.message || 'Could not delete category');
    }
  };

  const handleAddType = async () => {
    if (!newType.trim()) return;
    setBusy(true);
    try {
      await galleryApi.addType(newType.trim());
      await qc.invalidateQueries({ queryKey: ['gallery-meta'] });
      setNewType('');
      toast.success('Type added');
    } catch (e: any) {
      setError(e.message || 'Could not add type');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteType = async (val: string) => {
    try {
      await galleryApi.removeType(val);
      await qc.invalidateQueries({ queryKey: ['gallery-meta'] });
      toast.success('Type removed');
    } catch (e: any) {
      setError(e.message || 'Could not delete type');
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Manage Categories & Types"
      subtitle="Add or delete photo categories and media types"
    >
      <T v="title" w="bold" style={{ marginBottom: 6 }}>Categories</T>
      <Row gap={8} style={{ marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Input value={newCat} onChangeText={setNewCat} placeholder="New category name…" />
        </View>
        <Button title="Add" icon={Plus} small onPress={handleAddCat} loading={busy} />
      </Row>

      <View style={{ gap: 6, marginBottom: 20 }}>
        {categories.map((c) => (
          <Row key={c.value} style={{ justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.bg, borderRadius: 10 }}>
            <T v="body" w="semibold">{c.label}</T>
            <IconButton icon={Trash2} label={`Delete ${c.label}`} tone="danger" size={30} onPress={() => handleDeleteCat(c.value)} />
          </Row>
        ))}
      </View>

      <T v="title" w="bold" style={{ marginBottom: 6 }}>Media Types</T>
      <Row gap={8} style={{ marginBottom: 12 }}>
        <View style={{ flex: 1 }}>
          <Input value={newType} onChangeText={setNewType} placeholder="New type (e.g. 360 View)…" />
        </View>
        <Button title="Add" icon={Plus} small onPress={handleAddType} loading={busy} />
      </Row>

      <View style={{ gap: 6 }}>
        {types.map((t) => (
          <Row key={t.value} style={{ justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.bg, borderRadius: 10 }}>
            <T v="body" w="semibold">{t.label}</T>
            <IconButton icon={Trash2} label={`Delete ${t.label}`} tone="danger" size={30} onPress={() => handleDeleteType(t.value)} />
          </Row>
        ))}
      </View>

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
