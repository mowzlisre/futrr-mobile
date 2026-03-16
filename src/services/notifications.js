import api from "./api";

export const getNotifications = async ({ unreadOnly = false } = {}) => {
  const res = await api.get("/notifications/", {
    params: unreadOnly ? { unread_only: true } : {},
  });
  return res.data;
};

export const markNotificationRead = async (id) => {
  const res = await api.patch(`/notifications/${id}/read/`);
  return res.data;
};
