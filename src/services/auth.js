import api from "./api";

export const loginUser = async (identifier, password) => {
  try {
    const res = await api.post("/users/login/", { identifier, password });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Login failed" };
  }
};

export const logoutUser = async (refreshToken) => {
  try {
    await api.post("/users/logout/", { refresh: refreshToken });
  } catch (_) {
    // ignore — tokens are cleared locally regardless
  }
};

