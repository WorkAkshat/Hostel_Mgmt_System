import { Linking } from 'react-native';

const ten = (phone?: string | null) => String(phone || '').replace(/\D/g, '').slice(-10);

export const call = (phone?: string | null) => {
  if (ten(phone).length === 10) Linking.openURL(`tel:${ten(phone)}`);
};

export const whatsapp = (phone?: string | null, text = '') => {
  if (ten(phone).length === 10) Linking.openURL(`https://wa.me/91${ten(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`);
};
