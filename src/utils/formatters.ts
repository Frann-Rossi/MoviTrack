import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const formatCurrency = (amount: number | string) => {
  const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
  return numericAmount.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  });
};

export const formatDate = (date: string | Date, formatStr: string = "dd 'de' MMMM") => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: es });
};

export const formatFullDate = (date: string | Date) => {
  return formatDate(date, "EEEE d 'de' MMMM 'de' yyyy");
};
