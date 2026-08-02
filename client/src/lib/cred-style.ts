export function credTextClass(score: number): string {
  if (score >= 10) return 'text-[#17C653] font-bold';
  if (score >= 1) return 'text-[#17C653]/90';
  if (score === 0) return 'text-[#99A1B7]';
  if (score >= -9) return 'text-[#F8285A]/90';
  return 'text-[#F8285A] font-bold';
}

export function formatCred(score: number): string {
  if (score > 0) return `+${score}`;
  return String(score);
}
