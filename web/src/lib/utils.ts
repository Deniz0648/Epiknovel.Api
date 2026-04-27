export function slugify(text: string): string {
  if (!text) return "";
  const trMap: { [key: string]: string } = {
    'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c',
    'Ğ': 'g', 'Ü': 'u', 'Ş': 's', 'İ': 'i', 'Ö': 'o', 'Ç': 'c'
  };
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[ğüşıöçĞÜŞİÖÇ]/g, (match) => trMap[match])
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function timeAgo(dateParam: string | Date | number): string {
  if (!dateParam) return "";

  const date = typeof dateParam === "object" ? dateParam : new Date(dateParam);
  const today = new Date();
  const seconds = Math.round((today.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const months = Math.round(days / 30);
  const years = Math.round(months / 12);

  if (seconds < 60) return "simdi";
  if (minutes < 60) return `${minutes} dk once`;
  if (hours < 24) return `${hours} sa once`;
  if (days < 30) return `${days} gun once`;
  if (months < 12) return `${months} ay once`;
  return `${years} yil once`;
}
