import api from "./api";

export const signupUser = async (email, username, password) => {
  try {
    const res = await api.post("/users/signup/", { email, username, password });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Signup failed" };
  }
};

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

export const googleOAuth = async (idToken) => {
  try {
    const res = await api.post("/users/oa/google/", { id_token: idToken });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Google sign-in failed" };
  }
};
