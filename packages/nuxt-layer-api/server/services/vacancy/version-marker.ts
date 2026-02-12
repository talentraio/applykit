import { createHash } from 'node:crypto';

type VacancyVersionSource = {
  company: string;
  jobPosition: string | null;
  description: string;
};

const normalizeText = (value: string | null): string => {
  if (!value) {
    return '';
  }

  return value.replace(/\r\n/g, '\n').trim();
};

export const buildVacancyVersionMarker = (vacancy: VacancyVersionSource): string => {
  const payload = JSON.stringify({
    company: normalizeText(vacancy.company),
    jobPosition: normalizeText(vacancy.jobPosition),
    description: normalizeText(vacancy.description)
  });

  return createHash('sha256').update(payload).digest('hex');
};
