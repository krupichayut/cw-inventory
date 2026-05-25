export const parseCustomDate = (dateVal) => {
  if (!dateVal) return new Date();
  
  // If it's a Firestore Timestamp: { seconds, nanoseconds } or has toDate
  if (dateVal && typeof dateVal.toDate === 'function') {
    return dateVal.toDate();
  }
  if (dateVal && typeof dateVal.seconds === 'number') {
    return new Date(dateVal.seconds * 1000);
  }
  
  if (dateVal instanceof Date) return dateVal;
  
  // If it's a timestamp number
  if (typeof dateVal === 'number') return new Date(dateVal);
  
  // If it's a string
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    
    // Check for DD/MM/YYYY HH:mm:ss (or D/M/YYYY H:mm:ss) slash formats
    if (trimmed.includes('/')) {
      const parts = trimmed.split(' ');
      const dateParts = parts[0].split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // 0-based index
        let year = parseInt(dateParts[2], 10);
        
        // Normalize Buddhist year (e.g. 2569 -> 2026)
        if (year > 2400) {
          year -= 543;
        }
        
        let hour = 0, minute = 0, second = 0;
        if (parts.length > 1) {
          const timeParts = parts[1].split(':');
          if (timeParts.length >= 2) {
            hour = parseInt(timeParts[0], 10);
            minute = parseInt(timeParts[1], 10);
            if (timeParts.length >= 3) {
              second = parseInt(timeParts[2], 10);
            }
          }
        }
        return new Date(year, month, day, hour, minute, second);
      }
    }
    
    // Fallback to standard JS Date parsing for ISO string, etc.
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  
  return new Date(); // final fallback
};

export const formatDateTimeThai = (isoDate) => {
  if (!isoDate) return '-';
  const d = parseCustomDate(isoDate);
  if (isNaN(d.getTime())) return String(isoDate);

  const day = d.getDate();
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543;
  const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  
  return `${day} ${month} ${year} เวลา ${time} น.`;
};

