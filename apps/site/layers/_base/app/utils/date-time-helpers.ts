import { format, isValid, parseISO } from 'date-fns';

export const dateBaseFormat = (dateIso: string, pattern = 'dd.MM.yyyy'): string => {
  const parsedDate = parseISO(dateIso);

  if (!isValid(parsedDate)) {
    return '';
  }

  return format(parsedDate, pattern);
};
