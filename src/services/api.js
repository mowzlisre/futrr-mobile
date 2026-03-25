import axios from "axios";
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "@/services/storage";
import { authBus } from "@/utils/authBus";

// const BASE_URL = "https://api.futrr.app/api";
const BASE_URL = "http://localhost:8000/api";


const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach access token to every outgoing request
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401 silently refresh and retry once
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refresh = await getRefreshToken();
        const res = await axios.post(`${BASE_URL}/token/refresh/`, { refresh });
        const { access } = res.data;
        await saveTokens(access, refresh);
        processQueue(null, access);
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        await clearTokens();
        authBus.forceLogout();
        throw err;
      } finally {
        isRefreshing = false;
      }
    }

    throw error;
  }
);

export default api;
