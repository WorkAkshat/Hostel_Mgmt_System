import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Eye, FileText, Image as ImageIcon, MapPin, Pencil, Phone, Plus, Save, Trash2, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { galleryApi, HelplineContact, HelplineDocument, HelplineRule } from '../api';
import { useAuth } from '../lib/auth';
import { call } from '../lib/contact';
import { useData } from '../lib/query';
import { colors, radius } from '../ui/theme';
import { Button, Card, Divider, IconButton, Press, Row, T } from '../ui/primitives';
import { Field, Input } from '../ui/form';
import { Confirm, useToast } from '../ui/feedback';
import { Appear, Screen, Section } from '../ui/layout';
import { Sheet } from '../ui/Sheet';

const DEFAULT_CONTACTS: HelplineContact[] = [
  { id: 'c-1', title: 'Chief Warden', phone: '9460191558', sub: 'Available for student support & queries' },
  { id: 'c-2', title: 'Hostel Caretaker', phone: '9001236013', sub: 'Room maintenance & day-to-day help' },
  { id: 'c-3', title: 'Emergency / Police Helpline', phone: '112', sub: 'National emergency assistance 24x7' },
];

const DEFAULT_RULES: HelplineRule[] = [
  { id: 'r-1', text: 'Night roll call attendance at 9:30 PM is mandatory for every resident.' },
  { id: 'r-2', text: 'Hostel main gate closes strictly at 10:00 PM.' },
  { id: 'r-3', text: 'Male visitors are restricted to the ground floor reception area only.' },
  { id: 'r-4', text: 'Sub-meter electricity is billed from 10th to 10th of each calendar month.' },
  { id: 'r-5', text: 'Leave requests must be applied through the app at least 24 hours prior to travel.' },
  { id: 'r-6', text: 'Maintain silence in study hours and cleanliness in mess and common areas.' },
];

export default function HelplineScreen() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const qc = useQueryClient();
  const toast = useToast();

  const query = useData(['helpline-rules'], galleryApi.helpline);

  // Hostel info edit state
  const [editingHostel, setEditingHostel] = useState(false);
  const [hostelNameInput, setHostelNameInput] = useState('');
  const [hostelAddressInput, setHostelAddressInput] = useState('');
  const [savingHostel, setSavingHostel] = useState(false);

  // Contact add/edit state
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [targetContact, setTargetContact] = useState<HelplineContact | null>(null);
  const [contactTitle, setContactTitle] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSub, setContactSub] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [deletingContact, setDeletingContact] = useState<HelplineContact | null>(null);

  // Rule add/edit state
  const [ruleSheetOpen, setRuleSheetOpen] = useState(false);
  const [targetRule, setTargetRule] = useState<HelplineRule | null>(null);
  const [ruleText, setRuleText] = useState('');
  const [savingRule, setSavingRule] = useState(false);
  const [deletingRule, setDeletingRule] = useState<HelplineRule | null>(null);

  // Document / Notice Sheet state
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docDescription, setDocDescription] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<HelplineDocument | null>(null);
  const [viewingDoc, setViewingDoc] = useState<HelplineDocument | null>(null);

  const hostelName = query.data?.hostelName || 'Hari Pushp Tower (Girls PG)';
  const hostelAddress = query.data?.address || 'Sector 4, Jaipur, Rajasthan';

  const contacts: HelplineContact[] = useMemo(() => {
    if (query.data?.contacts && Array.isArray(query.data.contacts) && query.data.contacts.length > 0) {
      return query.data.contacts;
    }
    return DEFAULT_CONTACTS;
  }, [query.data]);

  const rules: HelplineRule[] = useMemo(() => {
    if (query.data?.rules && Array.isArray(query.data.rules) && query.data.rules.length > 0) {
      return query.data.rules.map((r: any, idx: number) =>
        typeof r === 'string' ? { id: `r-${idx + 1}`, text: r } : r
      );
    }
    return DEFAULT_RULES;
  }, [query.data]);

  const documents: HelplineDocument[] = useMemo(() => {
    if (query.data?.documents && Array.isArray(query.data.documents)) {
      return query.data.documents;
    }
    return [];
  }, [query.data]);

  // Handlers for Hostel Info
  const openEditHostel = () => {
    setHostelNameInput(hostelName);
    setHostelAddressInput(hostelAddress);
    setEditingHostel(true);
  };

  const handleSaveHostel = async () => {
    if (!hostelNameInput.trim()) {
      return toast.error('Required', 'Please enter hostel name');
    }
    setSavingHostel(true);
    try {
      await galleryApi.updateHostelInfo({
        hostelName: hostelNameInput.trim(),
        address: hostelAddressInput.trim(),
      });
      toast.success('Updated', 'Hostel details updated successfully');
      await qc.invalidateQueries({ queryKey: ['helpline-rules'] });
      setEditingHostel(false);
    } catch (e: any) {
      toast.error('Failed to update', e.message || 'Please try again');
    } finally {
      setSavingHostel(false);
    }
  };

  // Handlers for Contacts
  const openAddContact = () => {
    setTargetContact(null);
    setContactTitle('');
    setContactPhone('');
    setContactSub('');
    setContactSheetOpen(true);
  };

  const openEditContact = (c: HelplineContact) => {
    setTargetContact(c);
    setContactTitle(c.title);
    setContactPhone(c.phone);
    setContactSub(c.sub || '');
    setContactSheetOpen(true);
  };

  const handleSaveContact = async () => {
    if (!contactTitle.trim() || !contactPhone.trim()) {
      return toast.error('Required', 'Please enter title and phone number');
    }
    setSavingContact(true);
    try {
      if (targetContact) {
        await galleryApi.updateContact(targetContact.id, {
          title: contactTitle.trim(),
          phone: contactPhone.trim(),
          sub: contactSub.trim(),
        });
        toast.success('Saved', 'Contact updated successfully');
      } else {
        await galleryApi.addContact({
          title: contactTitle.trim(),
          phone: contactPhone.trim(),
          sub: contactSub.trim(),
        });
        toast.success('Added', 'New contact added to helpline');
      }
      await qc.invalidateQueries({ queryKey: ['helpline-rules'] });
      setContactSheetOpen(false);
    } catch (e: any) {
      toast.error('Failed to save contact', e.message || 'Please try again');
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!deletingContact) return;
    try {
      await galleryApi.removeContact(deletingContact.id);
      toast.success('Deleted', 'Contact removed from helpline');
      await qc.invalidateQueries({ queryKey: ['helpline-rules'] });
      setDeletingContact(null);
    } catch (e: any) {
      toast.error('Failed to delete', e.message || 'Please try again');
    }
  };

  // Handlers for Rules
  const openAddRule = () => {
    setTargetRule(null);
    setRuleText('');
    setRuleSheetOpen(true);
  };

  const openEditRule = (r: HelplineRule) => {
    setTargetRule(r);
    setRuleText(r.text);
    setRuleSheetOpen(true);
  };

  const handleSaveRule = async () => {
    if (!ruleText.trim()) {
      return toast.error('Required', 'Please enter guideline/rule text');
    }
    setSavingRule(true);
    try {
      if (targetRule) {
        await galleryApi.updateRule(targetRule.id, {
          text: ruleText.trim(),
        });
        toast.success('Saved', 'Guideline updated successfully');
      } else {
        await galleryApi.addRule({
          text: ruleText.trim(),
        });
        toast.success('Added', 'New rule added to guidelines');
      }
      await qc.invalidateQueries({ queryKey: ['helpline-rules'] });
      setRuleSheetOpen(false);
    } catch (e: any) {
      toast.error('Failed to save rule', e.message || 'Please try again');
    } finally {
      setSavingRule(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRule) return;
    try {
      await galleryApi.removeRule(deletingRule.id);
      toast.success('Deleted', 'Guideline removed');
      await qc.invalidateQueries({ queryKey: ['helpline-rules'] });
      setDeletingRule(null);
    } catch (e: any) {
      toast.error('Failed to delete', e.message || 'Please try again');
    }
  };

  // Handlers for Official Notice / Rule Sheet
  const pickSheetFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return toast.error('Permission needed', 'Please allow gallery access to upload notice or rule sheet.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedAsset(result.assets[0]);
    }
  };

  const captureSheetPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return toast.error('Permission needed', 'Please allow camera access to take photo of notice or rule sheet.');
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedAsset(result.assets[0]);
    }
  };

  const handleUploadDocument = async () => {
    if (!docTitle.trim()) {
      return toast.error('Required', 'Please enter a title for the sheet or notice');
    }
    if (!selectedAsset) {
      return toast.error('Required', 'Please select a photo or scan of the sheet / notice');
    }

    setSavingDoc(true);
    try {
      const mime = selectedAsset.mimeType || 'image/jpeg';
      const fileData = selectedAsset.base64 ? `data:${mime};base64,${selectedAsset.base64}` : selectedAsset.uri;

      await galleryApi.addDocument({
        title: docTitle.trim(),
        description: docDescription.trim(),
        fileData,
      });

      toast.success('Uploaded', 'Notice / rule sheet is now visible to all residents');
      await qc.invalidateQueries({ queryKey: ['helpline-rules'] });
      setUploadDocOpen(false);
      setDocTitle('');
      setDocDescription('');
      setSelectedAsset(null);
    } catch (e: any) {
      toast.error('Upload failed', e.message || 'Please try again');
    } finally {
      setSavingDoc(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deletingDoc) return;
    try {
      await galleryApi.removeDocument(deletingDoc.id);
      toast.success('Deleted', 'Sheet / notice removed');
      await qc.invalidateQueries({ queryKey: ['helpline-rules'] });
      setDeletingDoc(null);
    } catch (e: any) {
      toast.error('Failed to delete', e.message || 'Please try again');
    }
  };

  return (
    <Screen
      title="Helpline & Rules"
      subtitle="24x7 support & hostel guidelines"
      back
      tabBar={false}
      onRefresh={async () => {
        await qc.invalidateQueries({ queryKey: ['helpline-rules'] });
      }}
    >
      <Appear>
        <Card tone="mint" style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.mint200, alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={24} color={colors.brand700} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="title" w="bold">{hostelName}</T>
            <T v="caption" c={colors.text2}>{hostelAddress}</T>
          </View>
          {admin && (
            <IconButton
              icon={Pencil}
              label="Edit hostel details"
              tone="sun"
              size={36}
              onPress={openEditHostel}
            />
          )}
        </Card>
      </Appear>

      {/* Official Notice & Rule Sheets Section */}
      <Appear i={1}>
        <Section
          title="Official Sheets & Notices"
          action={admin ? '+ Upload Sheet' : undefined}
          onAction={admin ? () => setUploadDocOpen(true) : undefined}
        >
          {documents.length === 0 ? (
            <Card style={{ padding: 16, alignItems: 'center', gap: 6 }}>
              <FileText size={32} color={colors.text3} />
              <T v="title" w="semibold" center>No uploaded sheets yet</T>
              <T v="caption" c={colors.text2} center>
                {admin ? 'Tap "+ Upload Sheet" to upload official warden circulars, code of conduct, or notice sheets.' : 'Official warden circulars and rule sheets will appear here.'}
              </T>
              {admin && (
                <Button
                  title="Upload Sheet / Notice"
                  icon={Upload}
                  small
                  onPress={() => setUploadDocOpen(true)}
                  style={{ marginTop: 6 }}
                />
              )}
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {documents.map((doc) => (
                <Press
                  key={doc.id}
                  onPress={() => setViewingDoc(doc)}
                  style={{ borderRadius: radius.card }}
                >
                  <Card tone="white" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
                    <Image
                      source={{ uri: doc.url }}
                      style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: colors.mint50 }}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <T v="title" w="bold" numberOfLines={1}>{doc.title}</T>
                      {doc.description ? <T v="caption" c={colors.text2} numberOfLines={1}>{doc.description}</T> : null}
                      <T v="caption" c={colors.brand700} w="semibold" style={{ marginTop: 2 }}>Tap to view full sheet ›</T>
                    </View>
                    <Row gap={6} align="center">
                      <IconButton
                        icon={Eye}
                        label="View sheet"
                        tone="mint"
                        size={36}
                        onPress={() => setViewingDoc(doc)}
                      />
                      {admin && (
                        <IconButton
                          icon={Trash2}
                          label="Delete sheet"
                          tone="danger"
                          size={36}
                          onPress={() => setDeletingDoc(doc)}
                        />
                      )}
                    </Row>
                  </Card>
                </Press>
              ))}
            </View>
          )}
        </Section>
      </Appear>

      {/* 24x7 Contacts Section */}
      <Appear i={2}>
        <Section
          title="24x7 Contacts & Helpline"
          action={admin ? '+ Add Contact' : undefined}
          onAction={admin ? openAddContact : undefined}
        >
          <Card padded={false}>
            {contacts.map((c, i) => (
              <View key={c.id || c.phone || i}>
                {i > 0 && <Divider />}
                <Row style={{ padding: 14, alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <T v="title" w="bold">{c.title}</T>
                    <T v="small" c={colors.brand700} w="semibold">{c.phone}</T>
                    {c.sub ? <T v="caption" c={colors.text3} style={{ marginTop: 2 }}>{c.sub}</T> : null}
                  </View>
                  <Row gap={6} align="center">
                    {admin && (
                      <>
                        <IconButton
                          icon={Pencil}
                          label={`Edit ${c.title}`}
                          tone="sun"
                          size={36}
                          onPress={() => openEditContact(c)}
                        />
                        <IconButton
                          icon={Trash2}
                          label={`Delete ${c.title}`}
                          tone="danger"
                          size={36}
                          onPress={() => setDeletingContact(c)}
                        />
                      </>
                    )}
                    <IconButton
                      icon={Phone}
                      label={`Call ${c.title}`}
                      tone="mint"
                      size={40}
                      onPress={() => call(c.phone)}
                    />
                  </Row>
                </Row>
              </View>
            ))}
          </Card>
        </Section>
      </Appear>

      {/* Rules Section */}
      <Appear i={3}>
        <Section
          title="Hostel Guidelines & Rules"
          action={admin ? '+ Add Rule' : undefined}
          onAction={admin ? openAddRule : undefined}
        >
          <Card style={{ paddingVertical: 6, paddingHorizontal: 14 }}>
            {rules.map((r, idx) => (
              <View key={r.id || idx}>
                {idx > 0 && <Divider />}
                <Row align="center" gap={10} style={{ paddingVertical: 10 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.mint100, alignItems: 'center', justifyContent: 'center' }}>
                    <T v="caption" w="bold" c={colors.brand700}>{idx + 1}</T>
                  </View>
                  <T c={colors.text2} style={{ flex: 1, lineHeight: 20 }}>{r.text}</T>
                  {admin && (
                    <Row gap={4} align="center">
                      <IconButton
                        icon={Pencil}
                        label="Edit rule"
                        tone="sun"
                        size={32}
                        onPress={() => openEditRule(r)}
                      />
                      <IconButton
                        icon={Trash2}
                        label="Delete rule"
                        tone="danger"
                        size={32}
                        onPress={() => setDeletingRule(r)}
                      />
                    </Row>
                  )}
                </Row>
              </View>
            ))}
          </Card>
        </Section>
      </Appear>

      {/* Upload Sheet / Notice Modal */}
      <Sheet
        open={uploadDocOpen}
        onClose={() => { setUploadDocOpen(false); setSelectedAsset(null); }}
        title="Upload Sheet / Notice"
        subtitle="Attach circular, printed rule sheet or notice"
        footer={
          <Button
            title={savingDoc ? 'Uploading…' : 'Upload Sheet / Notice'}
            icon={Upload}
            onPress={handleUploadDocument}
            loading={savingDoc}
            full
          />
        }
      >
        <Field label="Sheet / Notice Title" required>
          <Input
            value={docTitle}
            onChangeText={setDocTitle}
            placeholder="e.g. Annual Code of Conduct Sheet, Mess Circular"
          />
        </Field>
        <Field label="Description / Summary (Optional)">
          <Input
            value={docDescription}
            onChangeText={setDocDescription}
            placeholder="e.g. Official signed copy approved by Warden"
          />
        </Field>

        <Field label="Select Sheet / Document Photo" required>
          <Row gap={10}>
            <Button
              title="From Gallery"
              icon={ImageIcon}
              kind="secondary"
              onPress={pickSheetFromGallery}
              style={{ flex: 1 }}
            />
            <Button
              title="Take Photo"
              icon={Camera}
              kind="secondary"
              onPress={captureSheetPhoto}
              style={{ flex: 1 }}
            />
          </Row>

          {selectedAsset ? (
            <View style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.mint50, padding: 8, alignItems: 'center' }}>
              <Image
                source={{ uri: selectedAsset.uri }}
                style={{ width: '100%', height: 180, borderRadius: 8 }}
                resizeMode="contain"
              />
              <T v="caption" c={colors.brand700} w="semibold" style={{ marginTop: 6 }}>
                Sheet photo selected ({Math.round((selectedAsset.width || 0))}×{Math.round((selectedAsset.height || 0))})
              </T>
            </View>
          ) : (
            <T v="caption" c={colors.text3} style={{ marginTop: 6 }}>
              Choose a clear photo, screenshot, or scanned document of the sheet or notice.
            </T>
          )}
        </Field>
      </Sheet>

      {/* Full Sheet Viewer Modal */}
      <Sheet
        open={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        title={viewingDoc?.title || 'Notice / Rule Sheet'}
        subtitle={viewingDoc?.description || 'Official hostel notice document'}
      >
        {viewingDoc && (
          <View style={{ gap: 12 }}>
            <ScrollView
              maximumZoomScale={3}
              minimumZoomScale={1}
              style={{ maxHeight: 440, borderRadius: 12, backgroundColor: '#000' }}
            >
              <Image
                source={{ uri: viewingDoc.url }}
                style={{ width: '100%', height: 420 }}
                resizeMode="contain"
              />
            </ScrollView>
            <T v="caption" c={colors.text3} center>
              Pinch or double tap to zoom in and read text
            </T>
            <Button
              title="Close Sheet"
              kind="secondary"
              onPress={() => setViewingDoc(null)}
              full
            />
          </View>
        )}
      </Sheet>

      {/* Edit Hostel Info Sheet */}
      <Sheet
        open={editingHostel}
        onClose={() => setEditingHostel(false)}
        title="Edit Hostel Details"
        subtitle="Update name & address shown to residents"
        footer={
          <Button
            title={savingHostel ? 'Saving…' : 'Save Details'}
            icon={Save}
            onPress={handleSaveHostel}
            loading={savingHostel}
            full
          />
        }
      >
        <Field label="Hostel / PG Name" required>
          <Input
            value={hostelNameInput}
            onChangeText={setHostelNameInput}
            placeholder="e.g. Hari Pushp Tower (Girls PG)"
          />
        </Field>
        <Field label="Address / Location">
          <Input
            value={hostelAddressInput}
            onChangeText={setHostelAddressInput}
            placeholder="e.g. Sector 4, Jaipur, Rajasthan"
          />
        </Field>
      </Sheet>

      {/* Add / Edit Contact Sheet */}
      <Sheet
        open={contactSheetOpen}
        onClose={() => { setContactSheetOpen(false); setTargetContact(null); }}
        title={targetContact ? 'Edit Helpline Contact' : 'Add Helpline Contact'}
        subtitle="24x7 phone number and role for residents"
        footer={
          <Button
            title={savingContact ? 'Saving…' : targetContact ? 'Save Changes' : 'Add Contact'}
            icon={targetContact ? Save : Plus}
            onPress={handleSaveContact}
            loading={savingContact}
            full
          />
        }
      >
        <Field label="Contact Name / Title" required>
          <Input
            value={contactTitle}
            onChangeText={setContactTitle}
            placeholder="e.g. Chief Warden, Caretaker, Ambulance"
          />
        </Field>
        <Field label="Phone Number" required>
          <Input
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="e.g. 9460191558 or 112"
            keyboardType="phone-pad"
          />
        </Field>
        <Field label="Subtitle / Availability" hint="Helpful info like timings or role">
          <Input
            value={contactSub}
            onChangeText={setContactSub}
            placeholder="e.g. Available for student support & queries"
          />
        </Field>
      </Sheet>

      {/* Add / Edit Rule Sheet */}
      <Sheet
        open={ruleSheetOpen}
        onClose={() => { setRuleSheetOpen(false); setTargetRule(null); }}
        title={targetRule ? 'Edit Hostel Rule' : 'Add Hostel Rule'}
        subtitle="Hostel policy or safety guideline for residents"
        footer={
          <Button
            title={savingRule ? 'Saving…' : targetRule ? 'Save Rule' : 'Add Rule'}
            icon={targetRule ? Save : Plus}
            onPress={handleSaveRule}
            loading={savingRule}
            full
          />
        }
      >
        <Field label="Rule / Policy Description" required>
          <Input
            value={ruleText}
            onChangeText={setRuleText}
            placeholder="e.g. Night roll call attendance at 9:30 PM is mandatory."
            multiline
            numberOfLines={3}
          />
        </Field>
      </Sheet>

      {/* Delete Document Confirmation */}
      <Confirm
        open={!!deletingDoc}
        title="Delete Sheet / Notice?"
        message={`Are you sure you want to remove "${deletingDoc?.title}"? Residents will no longer see it.`}
        confirmLabel="Delete Sheet"
        danger
        onConfirm={handleDeleteDocument}
        onClose={() => setDeletingDoc(null)}
      />

      {/* Delete Contact Confirmation */}
      <Confirm
        open={!!deletingContact}
        title="Delete Contact?"
        message={`Are you sure you want to remove "${deletingContact?.title}" (${deletingContact?.phone}) from the helpline?`}
        confirmLabel="Delete Contact"
        danger
        onConfirm={handleDeleteContact}
        onClose={() => setDeletingContact(null)}
      />

      {/* Delete Rule Confirmation */}
      <Confirm
        open={!!deletingRule}
        title="Delete Hostel Rule?"
        message="Are you sure you want to remove this guideline from the hostel rules?"
        confirmLabel="Delete Rule"
        danger
        onConfirm={handleDeleteRule}
        onClose={() => setDeletingRule(null)}
      />
    </Screen>
  );
}
