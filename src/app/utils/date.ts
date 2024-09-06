export const formatDateUtz = (date: Date) => {
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  const formattedDate = offsetDate.toISOString().split('T')[0];
  return formattedDate;
};

export function localToUtc(date) {
  // Pega o deslocamento do fuso horário em minutos e ajusta a data
  const utcDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return utcDate.toISOString();
}
