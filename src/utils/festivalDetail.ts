/** TourAPI 본문에 섞인 HTML 엔티티·태그를 읽기 쉬운 텍스트로 정리한다. */
export function stripTourHtml(value: string | null | undefined): string {
  if (!value?.trim()) {
    return '';
  }

  return value
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** homepage 필드가 앵커면 href만 추출 */
export function extractHref(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }
  const match = raw.match(/href\s*=\s*["']([^"']+)["']/i);
  if (match?.[1]) {
    return match[1].trim();
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return null;
}

/** YYYYMMDD → YYYY.MM.DD */
export function formatFestivalDate(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length !== 8) {
    return value?.trim() || '';
  }
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

export function formatFestivalPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const a = formatFestivalDate(start);
  const b = formatFestivalDate(end);
  if (!a && !b) return '';
  if (a && b && a !== b) return `${a} ~ ${b}`;
  return a || b;
}
