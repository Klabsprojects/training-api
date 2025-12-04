const crypto = require('crypto');

function encrypt(input) {
    const offset = 50;
    return input.split('').map(char => String.fromCharCode(char.charCodeAt(0) + offset)).join('');
}

function decrypt(input) {
    const offset = 50;
    return input.split('').map(char => String.fromCharCode(char.charCodeAt(0) - offset)).join('');
}

function createSessions(startDate, endDate, att) {
    let sessions = [];
    let currentDate = new Date(startDate);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    while (currentDate <= new Date(endDate)) {
        const day = String(currentDate.getDate()).padStart(2, '0'); 
        const month = monthNames[currentDate.getMonth()];
        const year = String(currentDate.getFullYear()).slice(-2); 
        const dateStr = `${day}-${month}-${year}`;

        sessions.push({ session: dateStr+' FN', marked: 'Not Taken'});
        sessions.push({ session: dateStr+' AN', marked: 'Not Taken'});
        currentDate.setDate(currentDate.getDate() + 1); 
    }

    const attSessions = att ? (Array.isArray(att) ? att : att.split(',')) : [];
    sessions.forEach(entry => {
        if (attSessions.includes(entry.session)) {
          entry.marked = "Completed"; 
        }
      });

    return sessions;
}

function customDate(aDate) {
    const date = new Date(aDate);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[date.getDay()];
    const dayOfMonth = date.getDate();
    const monthName = months[date.getMonth()];

    const suffix = (dayOfMonth % 10 === 1 && dayOfMonth !== 11) ? 'st' :
                   (dayOfMonth % 10 === 2 && dayOfMonth !== 12) ? 'nd' :
                   (dayOfMonth % 10 === 3 && dayOfMonth !== 13) ? 'rd' : 'th';

    return `${dayName}, ${dayOfMonth}${suffix} ${monthName}`;
}

function customDateFull(aDate) {
    const date = new Date(aDate);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[date.getDay()];
    const dayOfMonth = date.getDate();
    const monthName = months[date.getMonth()];
    const year= date.getFullYear();

    const suffix = (dayOfMonth % 10 === 1 && dayOfMonth !== 11) ? 'st' :
                   (dayOfMonth % 10 === 2 && dayOfMonth !== 12) ? 'nd' :
                   (dayOfMonth % 10 === 3 && dayOfMonth !== 13) ? 'rd' : 'th';

    return `${dayName}, ${dayOfMonth}${suffix} ${monthName} ${year}`;
}

function PeriodRange(period) {
  const today = new Date();

  function formatDate(date) {
    return date.toISOString().slice(0, 10); // 'YYYY-MM-DD'
  }

  let startDate, endDate;

  switch (period) {
    case "thisWeek": {
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - today.getDay()); // Sunday
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6); // Saturday
      startDate = formatDate(firstDay);
      endDate = formatDate(lastDay);
      break;
    }

    case "lastWeek": {
      const firstDay = new Date(today);
      firstDay.setDate(today.getDate() - today.getDay() - 7); // Previous Sunday
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6); // Previous Saturday
      startDate = formatDate(firstDay);
      endDate = formatDate(lastDay);
      break;
    }

    case "thisMonth": {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startDate = formatDate(firstDay);
      endDate = formatDate(lastDay);
      break;
    }

    case "lastMonth": {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      startDate = formatDate(firstDay);
      endDate = formatDate(lastDay);
      break;
    }

    default:
      startDate = null;
      endDate = null;
      break;
  }

  return { startDate, endDate };
}


function hexenc(text, secretKey) {
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function hexdec(encryptedText, secretKey) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function amtwrds(num) {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const units = ["", "Thousand", "Lakh", "Crore", "Arab", "Kharab"];

    if (num === 0) return "Zero";

    function convert(n) {
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 11];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
        if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
        return "";
    }

    let parts = ["Rupees"];
    let place = 0;

    let remainder = num;
    if (remainder >= 10000000) {
        parts.push(convert(Math.floor(remainder / 10000000)) + " Crore");
        remainder %= 10000000;
    }
    if (remainder >= 100000) {
        parts.push(convert(Math.floor(remainder / 100000)) + " Lakh");
        remainder %= 100000;
    }
    if (remainder >= 1000) {
        parts.push(convert(Math.floor(remainder / 1000)) + " Thousand");
        remainder %= 1000;
    }
    if (remainder > 0) {
        parts.push(convert(remainder));
    }

    return parts.join(" ") + " Only";
}

module.exports = {encrypt, decrypt, hexenc, hexdec, createSessions, customDate, PeriodRange, customDateFull, amtwrds};
