export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatLongDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

export const getDaysUntil = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diff = target - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getCountdown = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diff = target - now;

  if (diff <= 0) return { years: 0, days: 0, hours: 0, mins: 0, secs: 0 };

  const totalSecs  = Math.floor(diff / 1000);
  const years      = Math.floor(totalSecs / (365 * 86400));
  const remSecs    = totalSecs - years * 365 * 86400;
  const days       = Math.floor(remSecs / 86400);
  const hours      = Math.floor((remSecs % 86400) / 3600);
  const mins       = Math.floor((remSecs % 3600) / 60);
  const secs       = Math.floor(remSecs % 60);

  return { years, days, hours, mins, secs };
};

export const getProgress = (sealedAt, unlocksAt) => {
  const now = new Date();
  const start = new Date(sealedAt);
  const end = new Date(unlocksAt);
  const total = end - start;
  const elapsed = now - start;
  return Math.min(Math.max(elapsed / total, 0), 1);
};
