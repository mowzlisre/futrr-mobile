const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
              "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
              "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function below100(n) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = n % 10;
  return o ? t + " " + ONES[o] : t;
}

function below1000(n) {
  if (n < 100) return below100(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  return ONES[h] + " hundred" + (r ? " and " + below100(r) : "");
}

export function toWords(n) {
  if (!Number.isFinite(n)) return "zero";
  n = Math.max(0, Math.floor(n));
  if (n === 0) return "zero";
  if (n < 1000) return below1000(n);
  if (n < 1_000_000) {
    const k = Math.floor(n / 1000);
    const r = n % 1000;
    return below1000(k) + " thousand" + (r ? " " + below1000(r) : "");
  }
  if (n < 1_000_000_000) {
    const m = Math.floor(n / 1_000_000);
    const r = n % 1_000_000;
    return below1000(m) + " million" + (r ? " " + toWords(r) : "");
  }
  const b = Math.floor(n / 1_000_000_000);
  const r = n % 1_000_000_000;
  return below1000(b) + " billion" + (r ? " " + toWords(r) : "");
}
