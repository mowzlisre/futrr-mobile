import api from "./api";

export const sendOTP = async (email) => {
  try {
    const res = await api.post("/users/email/send-otp/", { email });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Failed to send code" };
  }
};

export const verifyOTP = async (email, otp) => {
  try {
    const res = await api.post("/users/email/verify-otp/", { email, otp });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Invalid code" };
  }
};

export const checkEmail = async (email) => {
  try {
    const res = await api.get("/users/check-email/", { params: { email } });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Check failed" };
  }
};

export const checkUsername = async (username) => {
  try {
    const res = await api.get("/users/check-username/", { params: { username } });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Check failed" };
  }
};

export const completeRegistration = async (email, sessionToken, username, password) => {
  try {
    const res = await api.post("/users/register/", {
      email,
      session_token: sessionToken,
      username,
      password,
    });
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Registration failed" };
  }
};

export const completePreboarding = async (payload) => {
  try {
    const res = await api.patch("/users/preboarding/complete/", payload);
    return res.data;
  } catch (err) {
    throw err.response?.data || { error: "Preboarding failed" };
  }
};
