import * as SecureStore from "expo-secure-store";

export const saveTokens = async (access, refresh) => {
  await SecureStore.setItemAsync("access_token", access);
  await SecureStore.setItemAsync("refresh_token", refresh);
};

export const getAccessToken = async () => {
  return await SecureStore.getItemAsync("access_token");
};

export const logout = async () => {
  await SecureStore.deleteItemAsync("access_token");
  await SecureStore.deleteItemAsync("refresh_token");
};