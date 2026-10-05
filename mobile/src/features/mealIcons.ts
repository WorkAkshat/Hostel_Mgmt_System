import { Coffee, Cookie, Moon, Soup, type LucideIcon } from 'lucide-react-native';

// One icon per meal so the day reads at a glance
export const MEAL_ICONS: Record<string, LucideIcon> = { breakfast: Coffee, lunch: Soup, snacks: Cookie, dinner: Moon };
