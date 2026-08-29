// Company metadata for all Hari Pushp PG entities
// Used for Demand Notes, Invoices, and Reports

const COMPANY_CONFIG = {
  1: {
    floorNumber: 1,
    companyName: 'Rajken Enterprises',
    hostelName: 'Hari Pushp Girls Hostel',
    floorLabel: 'First Floor',
    address: 'Hari Pushp Tower, Plot No. 10, First Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018',
    san: '', // To be filled
    udyamRegNo: '', // To be filled
    proprietorName: 'Kapil Sankhla',
    notePrefix: 'RJK',
    fssai: null,
  },
  2: {
    floorNumber: 2,
    companyName: 'Vandana Enterprises',
    hostelName: 'Vandana Girls Hostel',
    floorLabel: 'Second Floor',
    address: 'Hari Pushp Tower, Plot No. 10, Second Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018',
    san: '', // To be filled
    udyamRegNo: 'UDYAM-RJ-17-0654053',
    proprietorName: 'Vandana Sankhla',
    notePrefix: 'VAN',
    fssai: null,
  },
  3: {
    floorNumber: 3,
    companyName: 'Pushpa Enterprises',
    hostelName: 'Pushpa Girls Hostel',
    floorLabel: 'Third Floor',
    address: 'Hari Pushp Tower, Plot No. 10, Third Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018',
    san: '8007170053000004',
    udyamRegNo: 'UDYAM-RJ-17-0654175',
    proprietorName: 'Pushpa Sankhla',
    notePrefix: 'PSH',
    fssai: null,
  },
  4: {
    floorNumber: 4,
    companyName: 'Harish Chandra Enterprises',
    hostelName: 'Harish Chandra Girls Hostel',
    floorLabel: 'Fourth Floor',
    address: 'Hari Pushp Tower, Plot No. 10, Fourth Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018',
    san: '8007170053000006',
    udyamRegNo: 'UDYAM-RJ-17-0654078',
    proprietorName: 'Harish Chandra',
    notePrefix: 'HCE',
    fssai: null,
  },
  5: {
    floorNumber: 5,
    companyName: 'Ramesh Enterprises',
    hostelName: 'Ramesh Girls Hostel',
    floorLabel: 'Fifth & Sixth Floor',
    address: 'Hari Pushp Tower, Plot No. 10, Fifth & Sixth Floor, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018',
    san: '', // To be filled
    udyamRegNo: '', // To be filled
    proprietorName: 'Ramesh Sankhla',
    notePrefix: 'RME',
    fssai: null,
  },
  // Meenakshi Enterprises (Catering - covers all floors)
  catering: {
    floorNumber: null,
    companyName: 'Meenakshi Enterprises',
    hostelName: 'Meenakshi Enterprises (Catering & Food Services)',
    floorLabel: 'All Floors',
    address: 'Hari Pushp Tower, Plot No. 10, Gayatri Nagar B, Maharani Farm, Durgapura, Jaipur, Rajasthan - 302018',
    san: '8007170053000003',
    udyamRegNo: 'UDYAM-RJ-17-0662384',
    fssai: '22226113000448',
    proprietorName: 'Manisha Parihar',
    notePrefix: 'ME',
  },
};

// Fee structure
const FEE_STRUCTURE = {
  hostel: {
    1: 16000, // Single sharing
    2: 14000, // Twin sharing
    3: 12000, // Triple sharing
  },
  mess: 3000, // Meenakshi Enterprises monthly catering
  electricityRate: 12.0, // ₹ per unit
  lateFeePerDay: 100, // ₹ per day after due date
};

// Generate Demand Note number: PREFIX/YYYY-YY/MM/NNN
const generateDemandNoteNumber = (prefix, billingMonth, sequenceNumber) => {
  const [year, month] = billingMonth.split('-');
  const nextYear = (parseInt(year, 10) + 1).toString().slice(-2);
  const seq = String(sequenceNumber).padStart(3, '0');
  return `${prefix}/${year}-${nextYear}/${month}/${seq}`;
};

// Number to words (Indian style)
const numberToWords = (num) => {
  if (num === 0) return 'Zero Rupees Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };
  
  return convert(Math.round(num)) + ' Rupees Only';
};

module.exports = {
  COMPANY_CONFIG,
  FEE_STRUCTURE,
  generateDemandNoteNumber,
  numberToWords,
};
