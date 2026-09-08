export { ProfileTabs } from "./components/ProfileTabs";
export { ProfileDialog } from "./components/ProfileDialog";
export {
  AVAILABLE_ICONS,
  AVAILABLE_COLORS,
  getProfileIconComponent,
  getProfileColorClasses,
} from "./constants/profiles";
export {
  createProfileSchema,
  createProfileNameSchema,
  getAvailableDuplicateName,
  type ProfileFormData,
  type ProfileValidationContext,
} from "./schemas/profileSchema";
