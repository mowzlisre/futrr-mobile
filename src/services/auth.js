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

