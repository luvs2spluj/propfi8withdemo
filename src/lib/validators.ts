export const looksLikeEmail = (v: string): boolean => /.+@.+\..+/.test(v);

export const looksLikeCurrency = (v: string): boolean => /[$,-]|\d+\.\d{2}/.test(v);

export const normalizeCurrency = (v: string): number | null => {
  const n = parseFloat(v.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export const looksLikeDate = (v: string): boolean => 
  /\d{4}-\d{1,2}-\d{1,2}|[A-Za-z]{3,}\s+\d{4}|^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(v);
