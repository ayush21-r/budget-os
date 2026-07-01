import { BookOpen, Bus, GraduationCap, HeartPulse, Repeat, Shirt, Utensils, Wallet } from 'lucide-react';

export const categoryIconOptions = [
  { value: 'utensils', label: 'Food', icon: Utensils },
  { value: 'graduation', label: 'College', icon: GraduationCap },
  { value: 'repeat', label: 'Subscriptions', icon: Repeat },
  { value: 'bus', label: 'Transport', icon: Bus },
  { value: 'heart', label: 'Wellness', icon: HeartPulse },
  { value: 'shirt', label: 'Personal', icon: Shirt },
  { value: 'book', label: 'Books', icon: BookOpen },
  { value: 'wallet', label: 'Misc', icon: Wallet },
];

export function getCategoryIcon(iconKey) {
  return categoryIconOptions.find((item) => item.value === iconKey)?.icon || Wallet;
}
