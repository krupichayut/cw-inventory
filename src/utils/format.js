export const formatDateTimeThai = (isoDate) => {
  if (!isoDate) return '-';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;

  const day = d.getDate();
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543;
  const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  
  return `${day} ${month} ${year} เวลา ${time} น.`;
};
