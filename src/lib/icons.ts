// Central icon registry: one meaning = one icon, everywhere (same idea as aoocommerce lib/icons.ts).
// Import icons from here, not from "lucide-react" directly. To change an icon app-wide, edit one line.
import {
  BarChart3,
  Building2,
  CalendarCheck,
  FileText,
  Inbox,
  Map,
  Menu,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Sun,
  User,
  UserCog,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "@/config/roles";

/** Menu icons, keyed by the IconName used in src/config/roles.ts. */
export const MENU_ICON: Record<IconName, LucideIcon> = {
  today: CalendarCheck,
  people: Users,
  plus: Plus,
  map: Map,
  me: User,
  chart: BarChart3,
  building: Building2,
  team: UsersRound,
  file: FileText,
  inbox: Inbox,
  gear: Settings,
  users: UserCog,
};

/** Phone bottom bar: opens the rest of the menu. */
export const MoreMenuIcon = Menu;

export const CollapseMenuIcon = PanelLeftClose;
export const ExpandMenuIcon = PanelLeftOpen;
export const LightThemeIcon = Sun;
export const DarkThemeIcon = Moon;
export const SystemThemeIcon = Monitor;

// ---------------------------------------------------------------
// Page icons: empty screens, section titles, project cards and stat tiles.
// ---------------------------------------------------------------
export {
  Building2 as ProjectIcon,
  MapPin as LocationIcon,
  Map as SitePlanIcon,
  LayoutGrid as PlotsIcon,
  House as FreePlotIcon,
  BookmarkCheck as ReservedIcon,
  KeyRound as TransferredIcon,
  Handshake as SoldIcon,
  Wallet as ValueIcon,
  Coins as StageValueIcon,
  MapPinned as PinImportIcon,
  ImagePlus as CoverUploadIcon,
  CircleCheckBig as AllDoneIcon,
  BellOff as NoNotificationsIcon,
  ChartNoAxesColumn as NoDataIcon,
  UsersRound as TeamIcon,
  Construction as NotBuiltIcon,
  Funnel as FunnelIcon,
  Megaphone as CampaignIcon,
  ThumbsDown as LostReasonIcon,
  FileSpreadsheet as ExportFileIcon,
  Sparkles as ClaudeIcon,
  ClipboardList as TeamPackIcon,
  Landmark as CompanyIcon,
  Radio as MetaIcon,
  FileText as DocumentIcon,
  Palette as ThemeIcon,
  SearchX as NoMatchIcon,
  HouseHeart as HouseModelIcon,
  BedDouble as BedroomIcon,
  Bath as BathroomIcon,
  Car as ParkingIcon,
  Ruler as UsableAreaIcon,
  LandPlot as LandAreaIcon,
  Pencil as EditIcon,
  Trash2 as DeleteIcon,
} from "lucide-react";

// ---------------------------------------------------------------
// Date picker (src/components/ui/date-range-picker.tsx)
// ---------------------------------------------------------------
export {
  CalendarDays as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  X as CloseIcon,
} from "lucide-react";

// ---------------------------------------------------------------
// Shared UI parts (modal, data table, lightbox, dropzone, menus, hints)
// ---------------------------------------------------------------
export {
  ChevronUp as SortAscIcon,
  ChevronDown as SortDescIcon,
  ChevronsUpDown as SortNoneIcon,
  ChevronDown as ChevronDownIcon,
  Check as CheckIcon,
  Minus as PartialIcon,
  Search as SearchIcon,
  UploadCloud as UploadIcon,
  FileText as FileIcon,
  Ellipsis as MoreIcon,
  CircleHelp as HelpIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Loader2 as LoadingIcon,
  Copy as CopyIcon,
  Clock as ClockIcon,
} from "lucide-react";

export { ChevronsUpDown as ProjectSwitchIcon, Layers as AllProjectsIcon } from "lucide-react";

/** Lead channels (src/config/channels.ts) and the add-lead form. */
export {
  Phone as ChannelCallIcon,
  Megaphone as ChannelAdsIcon,
  MessageCircle as ChannelMessengerIcon,
  MessageSquareText as ChannelLineIcon,
  Footprints as ChannelWalkinIcon,
  Sparkles as NewLeadIcon,
  UserRound as CustomerIcon,
  NotebookPen as FirstNoteIcon,
  CircleCheck as PickedIcon,
} from "lucide-react";

export { Columns3 as ColumnsIcon } from "lucide-react";
export { CalendarClock as AppointmentIcon, KeyRound as TransferIcon } from "lucide-react";
export { Phone as CallIcon, MapPinCheck as CheckInIcon, NotebookPen as NoteIcon } from "lucide-react";
export { X as RemoveIcon } from "lucide-react";
