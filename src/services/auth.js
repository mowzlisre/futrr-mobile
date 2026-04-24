import axios from "axios";
import api from "./api";

export const loginUser = async (identifier, password) => {
  try {
    const res = await api.post("/users/login/", { identifier, password });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Login failed" };
  }
};

export const forgotPassword = async (identifier) => {
  try {
    const res = await api.post("/users/password/forget/", { identifier });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Request failed" };
  }
};

export const verifyResetOTP = async (identifier, otp) => {
  try {
    const res = await api.post("/users/password/verify-otp/", { identifier, otp });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Invalid code" };
  }
};

export const resetPassword = async (identifier, sessionToken, newPassword, confirmPassword) => {
  try {
    const res = await api.post("/users/password/reset/", {
      identifier,
      session_token: sessionToken,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Reset failed" };
  }
};

export const logoutUser = async (refreshToken, accessToken) => {
  try {
    // Use raw axios to bypass the interceptor's token-refresh logic,
    // which would fail after tokens are cleared locally.
    await axios.post(
      `${api.defaults.baseURL}/users/logout/`,
      { refresh: refreshToken },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (_) {
    // ignore — tokens are cleared locally regardless
  }
};

