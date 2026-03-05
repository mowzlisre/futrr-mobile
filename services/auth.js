import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API = axios.create({
  baseURL: "https://api.futrr.app/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
});

export const loginUser = async (identifier, password) => {
  try {
    const res = await API.post("/auth/login/", {
      identifier,
      password
    });

    return res.data;
  } catch (err) {
    throw err.response?.data || { message: "Login failed" };
  }
};

export const saveTokens = async (accessToken, refreshToken) => {
  try {
    await SecureStore.setItemAsync("accessToken", accessToken);
    await SecureStore.setItemAsync("refreshToken", refreshToken);
  } catch (err) {
    console.error("Error saving tokens:", err);
    throw err;
  }
};

export const getAccessToken = async () => {
  try {
    return await SecureStore.getItemAsync("accessToken");
  } catch (err) {
    console.error("Error retrieving access token:", err);
    return null;
  }
};

export const getRefreshToken = async () => {
  try {
    return await SecureStore.getItemAsync("refreshToken");
  } catch (err) {
    console.error("Error retrieving refresh token:", err);
    return null;
  }
};

export const clearTokens = async () => {
  try {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
  } catch (err) {
    console.error("Error clearing tokens:", err);
    throw err;
  }
};