/** A browser has no haptics, so each call of the app does nothing. The app already ignores a failed haptic. */
export const ImpactFeedbackStyle = { Light: "light", Medium: "medium", Heavy: "heavy", Rigid: "rigid", Soft: "soft" } as const;
export const NotificationFeedbackType = { Success: "success", Warning: "warning", Error: "error" } as const;

export const selectionAsync = async (): Promise<void> => {};
export const impactAsync = async (_style?: string): Promise<void> => {};
export const notificationAsync = async (_type?: string): Promise<void> => {};
