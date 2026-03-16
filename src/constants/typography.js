import { Platform } from "react-native";

export const fonts = {
  serif: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" }),
  serifBold: Platform.select({ ios: "Georgia-Bold", android: "serif", default: "Georgia-Bold" }),
};
