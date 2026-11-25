const bcrypt = require('bcryptjs');

const ADMISSION_STUDENTS = [
  {
    name: 'Archi Verma',
    email: 'archi.verma@haripushppg.com',
    rollNumber: 'HARIPUSHP_004',
    phoneNumber: '9351857108',
    parentContact: '9460816629',
    fatherName: 'Deepak Kumar Verma',
    motherContact: '6376618600',
    siblingContact: '7728874418',
    emergencyContact: '9460816629',
    permanentAddress: 'Near Co-operative Bank, Bharti ji ki gali, Asind, Bhilwara',
    state: 'Rajasthan',
    pincode: '311301',
    coachingCollege: 'Maxcpp',
    maritalStatus: 'Unmarried',
    dob: new Date('2006-10-08'),
    dateOfJoining: new Date('2026-11-24'),
    roomNumber: '401',
    bedId: '401-A',
    monthlyRent: 12000,
    securityDeposit: 12000,
    notes: '24-Nov arrival, advance Rs 30,000 paid'
  },
  {
    name: 'Namita Chaudhary',
    email: 'namita.chaudhary@haripushppg.com',
    rollNumber: 'HARIPUSHP_005',
    phoneNumber: '6262359945',
    parentContact: '9826035538',
    fatherName: 'T.C. Chaudhary',
    permanentAddress: 'Opp. Ambedkar Society, Trimurti Nagar, Damoh Naka, Jabalpur',
    state: 'Madhya Pradesh',
    pincode: '482001',
    coachingCollege: 'Company - Pixellab media',
    maritalStatus: 'Unmarried',
    dob: new Date('2000-09-05'),
    dateOfJoining: new Date('2026-10-26'),
    roomNumber: '401',
    bedId: '401-B',
    monthlyRent: 12000,
    securityDeposit: 12000,
  },
  {
    name: 'Varsha Surana',
    email: 'varsha.surana@haripushppg.com',
    rollNumber: 'HARIPUSHP_006',
    phoneNumber: '6002812445',
    parentContact: '9435782087',
    fatherName: 'Bhag Chand Surana',
    motherContact: '8486694212',
    siblingContact: '7002093596',
    emergencyContact: '9007813502', // Local Guardian Ishar Chand Bhansali
    permanentAddress: '3rd floor, 3B, Arihant Tower, U.K.D. Sarani, Jail Road, Silchar, Cachar',
    state: 'Assam',
    pincode: '788001',
    coachingCollege: 'Professional / Self Study',
    maritalStatus: 'Unmarried',
    dob: new Date('1994-08-02'),
    dateOfJoining: new Date('2026-11-22'),
    roomNumber: '401',
    bedId: '401-C',
    monthlyRent: 12000,
    securityDeposit: 12000,
    notes: '7200 + 12000 paid, 12000 rent remaining 10 Dec'
  },
  {
    name: 'Siddhi Jain',
    email: 'siddhi.jain@haripushppg.com',
    rollNumber: 'HARIPUSHP_007',
    phoneNumber: '7425921279',
    parentContact: '9214921279',
    fatherName: 'Dilip Kumar Jain',
    motherContact: '7737119079',
    siblingContact: '9256965479',
    emergencyContact: '7410918234', // Local Guardian Renu Agarwal
    permanentAddress: 'Jain colony, Newai, Tonk',
    state: 'Rajasthan',
    pincode: '304021',
    coachingCollege: "MGD Girls' School",
    maritalStatus: 'Unmarried',
    dob: new Date('2009-04-21'),
    dateOfJoining: new Date('2026-06-30'),
    roomNumber: '405',
    bedId: '405-A',
    monthlyRent: 14000,
    securityDeposit: 14000,
  },
  {
    name: 'Diya Kothari',
    email: 'diya.kothari@haripushppg.com',
    rollNumber: 'HARIPUSHP_008',
    phoneNumber: '9320538986',
    parentContact: '9322126883',
    fatherName: 'Rakesh Kothari',
    motherContact: '7977385449',
    siblingContact: '9892686060',
    emergencyContact: '9322126883',
    permanentAddress: '11/A, Kanyawari Nagar, Kurla East, Mumbai - 24',
    state: 'Maharashtra',
    pincode: '400026',
    coachingCollege: 'Self Study',
    maritalStatus: 'Unmarried',
    dob: new Date('2004-03-31'),
    dateOfJoining: new Date('2026-11-15'),
    roomNumber: '405',
    bedId: '405-B',
    monthlyRent: 14000,
    securityDeposit: 14000,
  },
  {
    name: 'Ananya Khandelwal',
    email: 'ananya.khandelwal@haripushppg.com',
    rollNumber: 'HARIPUSHP_009',
    phoneNumber: '9610165134',
    parentContact: '9660687716',
    fatherName: 'Swapnil Tambi',
    motherContact: '9929025138',
    emergencyContact: '7568299822', // Local Guardian Saurav Rawat
    permanentAddress: 'Suraj Dham, Opp. Veterinary hospital, Link Road, Bagru',
    state: 'Rajasthan',
    pincode: '303007',
    coachingCollege: 'Company: Global Technologies',
    maritalStatus: 'Unmarried',
    dob: new Date('2006-07-19'),
    dateOfJoining: new Date('2026-11-12'),
    roomNumber: '306',
    bedId: '306-A',
    monthlyRent: 14000,
    securityDeposit: 14000,
  },
  {
    name: 'Anshika Garg',
    email: 'anshika.garg@haripushppg.com',
    rollNumber: 'HARIPUSHP_010',
    phoneNumber: '7814880536',
    parentContact: '9460431101',
    fatherName: 'Ajay Kumar Garg',
    motherContact: '8360990736',
    emergencyContact: '9079097833', // Local Guardian Nehal Aggarwal
    permanentAddress: '4-A Jawahar Nagar, Sri Ganganagar',
    state: 'Rajasthan',
    pincode: '335001',
    coachingCollege: 'Singhal law classes',
    maritalStatus: 'Unmarried',
    dob: new Date('2003-05-31'),
    dateOfJoining: new Date('2026-10-13'),
    roomNumber: '306',
    bedId: '306-B',
    monthlyRent: 12000,
    securityDeposit: 12000,
  },
  {
    name: 'Maniya Solanki',
    email: 'maniya.solanki@haripushppg.com',
    rollNumber: 'HARIPUSHP_011',
    phoneNumber: '9461169999',
    parentContact: '9413166999',
    fatherName: 'Jitendra Solanki',
    motherContact: '9252477444',
    siblingContact: '9530291999',
    emergencyContact: '9413166999',
    permanentAddress: 'Chamunda Weighbridge, NH162, Opp. Bharat Petroleum, Beawar Road, Sojat City, Pali',
    state: 'Rajasthan',
    pincode: '306104',
    coachingCollege: 'IIS (Deemed to be University)',
    maritalStatus: 'Unmarried',
    dob: new Date('2009-04-06'),
    dateOfJoining: new Date('2026-07-21'),
    roomNumber: '305',
    bedId: '305-A',
    monthlyRent: 14000,
    securityDeposit: 14000,
  },
  {
    name: 'Anvesha Rathore',
    email: 'anvesha.rathore@haripushppg.com',
    rollNumber: 'HARIPUSHP_012',
    phoneNumber: '8005758434',
    parentContact: '9772229994',
    fatherName: 'Ranvijay Singh',
    motherContact: '8302729991',
    siblingContact: '9828587612',
    emergencyContact: '9772229994',
    permanentAddress: 'Near housing board, Koushtubh Villa, Balotra, Pachpadra',
    state: 'Rajasthan',
    pincode: '344022',
    coachingCollege: 'National Academy of Event Management and Development, Jaipur',
    maritalStatus: 'Unmarried',
    dob: new Date('2008-08-23'),
    dateOfJoining: new Date('2026-10-04'),
    roomNumber: '301',
    bedId: '301-A',
    monthlyRent: 12000,
    securityDeposit: 12000,
  },
  {
    name: 'Simran Adwani',
    email: 'simran.adwani@haripushppg.com',
    rollNumber: 'HARIPUSHP_013',
    phoneNumber: '8949999877',
    parentContact: '8949999877',
    fatherName: 'Kushagra Jain (Fiance / Local Guardian)',
    emergencyContact: '8949999877',
    permanentAddress: '2/47 Pushpanjali Flora, Shamshabad Road, Agra',
    state: 'Uttar Pradesh',
    pincode: '282001',
    coachingCollege: 'IIHM',
    maritalStatus: 'Unmarried',
    dob: new Date('2005-03-02'),
    dateOfJoining: new Date('2026-10-18'),
    roomNumber: '201',
    bedId: '201-A',
    monthlyRent: 12000,
    securityDeposit: 12000,
  },
  {
    name: 'Sharwari Anil Nikalje',
    email: 'sharwari.nikalje@haripushppg.com',
    rollNumber: 'HARIPUSHP_014',
    phoneNumber: '8459816082',
    parentContact: '9860000205',
    fatherName: 'Anil Nikalje',
    motherContact: '9049300205',
    siblingContact: '9970803503',
    emergencyContact: '7387300005',
    permanentAddress: 'Vinayak Nagar, Lane No. 1, Pimple Gurav, Haveli, Pune',
    state: 'Maharashtra',
    pincode: '411061',
    coachingCollege: 'Top Crew Aviation',
    maritalStatus: 'Unmarried',
    dob: new Date('2004-04-15'),
    dateOfJoining: new Date('2026-11-15'),
    roomNumber: '105',
    bedId: '105-A',
    monthlyRent: 14000,
    securityDeposit: 14000,
  },
  {
    name: 'Pratha Jaysukhbhai Sasani',
    email: 'pratha.sasani@haripushppg.com',
    rollNumber: 'HARIPUSHP_015',
    phoneNumber: '7600691006',
    parentContact: '9664718010',
    fatherName: 'Jaysukhbhai Sasani',
    motherContact: '9586306900',
    siblingContact: '7435991210',
    emergencyContact: '9664718010',
    permanentAddress: 'E-303, Sunvelly Reg., Surat',
    state: 'Gujarat',
    pincode: '395007',
    coachingCollege: 'PILOTS PATHWAY',
    maritalStatus: 'Unmarried',
    dob: new Date('2008-09-02'),
    dateOfJoining: new Date('2026-07-10'),
    roomNumber: '106',
    bedId: '106-A',
    monthlyRent: 14000,
    securityDeposit: 12000,
  },
  {
    name: 'Ria Dhanwani',
    email: 'student@haripushppg.com',
    rollNumber: 'HARIPUSHP_HP_001',
    phoneNumber: '9548857141',
    parentContact: '9917725339',
    fatherName: 'Pawan Dhanwani',
    motherContact: '8449066072',
    emergencyContact: '8449066072',
    permanentAddress: 'C-803, Padam Pride, Sector 16-B, Awas Vikas, Sikandra, Agra',
    state: 'Uttar Pradesh',
    pincode: '282007',
    coachingCollege: 'Deloitte USI',
    maritalStatus: 'Unmarried',
    dob: new Date('2004-01-25'),
    dateOfJoining: new Date('2026-06-14'),
    roomNumber: '104',
    bedId: '104-Single',
    monthlyRent: 16000,
    securityDeposit: 16000,
  },
  {
    name: 'Shiun Tiku',
    email: 'shiun.tiku@haripushppg.com',
    rollNumber: 'HARIPUSHP_016',
    phoneNumber: '8082743215',
    parentContact: '9761731097',
    fatherName: 'Deepak Tiku',
    motherContact: '9419228903',
    siblingContact: '7780920658',
    emergencyContact: '9596579321',
    permanentAddress: 'H.No. 32/B, Lane-1, Ekta Vihar, Gangyal, Jammu',
    state: 'Jammu & Kashmir',
    pincode: '180010',
    coachingCollege: 'Pilots Pathway',
    maritalStatus: 'Unmarried',
    dob: new Date('2007-12-20'),
    dateOfJoining: new Date('2026-07-15'),
    roomNumber: '102',
    bedId: '102-B',
    monthlyRent: 14000,
    securityDeposit: 14000,
  }
];

const COMPANY_CONFIG = {
  1: { companyName: 'Rajken Enterprises', hostelName: 'Hari Pushp Girls Hostel' },
  2: { companyName: 'Vandana Enterprises', hostelName: 'Vandana Girls Hostel' },
  3: { companyName: 'Pushpa Enterprises', hostelName: 'Pushpa Girls Hostel' },
  4: { companyName: 'Harish Chandra Enterprises', hostelName: 'Harish Chandra Girls Hostel' },
  5: { companyName: 'Ramesh Enterprises', hostelName: 'Ramesh Girls Hostel' }
};

async function importAdmissionForms(prisma) {
  console.log('⚡ Starting admission forms import for 14 residents...');
  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  const results = [];

  for (const item of ADMISSION_STUDENTS) {
    // 1. Resolve room
    const room = await prisma.room.findUnique({
      where: { roomNumber: item.roomNumber }
    });

    if (!room) {
      console.warn(`[Skip] Room ${item.roomNumber} not found in database!`);
      continue;
    }

    // 2. Resolve User by email OR student phone
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: item.email },
          { student: { phoneNumber: item.phoneNumber } }
        ]
      },
      include: { student: true }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: item.email,
          name: item.name,
          password: hashedPassword,
          role: 'STUDENT',
        }
      });
      console.log(`✓ Created User account: ${user.name} (${user.email})`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: item.name,
          email: item.email
        }
      });
      console.log(`✓ Updated User account: ${user.name} (${user.email})`);
    }

    // 3. Create or update Student record
    let student = await prisma.student.findUnique({
      where: { userId: user.id }
    });

    const studentData = {
      rollNumber: item.rollNumber,
      phoneNumber: item.phoneNumber,
      parentContact: item.parentContact,
      fatherName: item.fatherName,
      motherContact: item.motherContact || null,
      siblingContact: item.siblingContact || null,
      emergencyContact: item.emergencyContact || item.parentContact,
      permanentAddress: item.permanentAddress,
      state: item.state,
      pincode: item.pincode,
      coachingCollege: item.coachingCollege,
      maritalStatus: item.maritalStatus,
      dob: item.dob,
      dateOfJoining: item.dateOfJoining,
      roomId: room.id,
      bedId: item.bedId,
      roomAssignedAt: item.dateOfJoining || new Date(),
      status: 'CHECKED_IN'
    };

    if (!student) {
      // Check if rollNumber conflict exists with another dummy record
      const existingRoll = await prisma.student.findUnique({ where: { rollNumber: item.rollNumber } });
      if (existingRoll && existingRoll.userId !== user.id) {
        studentData.rollNumber = `${item.rollNumber}_${Date.now().toString().slice(-4)}`;
      }

      student = await prisma.student.create({
        data: {
          userId: user.id,
          ...studentData
        }
      });
      console.log(`✓ Created Student profile: ${item.name} in Room ${item.roomNumber}`);
    } else {
      student = await prisma.student.update({
        where: { id: student.id },
        data: studentData
      });
      console.log(`✓ Updated Student profile: ${item.name} in Room ${item.roomNumber}`);
    }

    // 4. Update room occupancy status
    const currentStudentsInRoom = await prisma.student.findMany({
      where: { roomId: room.id, status: 'CHECKED_IN' }
    });
    const isFull = currentStudentsInRoom.length >= room.capacity;
    await prisma.room.update({
      where: { id: room.id },
      data: { status: isFull ? 'FULL' : 'AVAILABLE' }
    });

    // 5. Ensure Initial Monthly Rent Invoice exists
    const floorConfig = COMPANY_CONFIG[room.floorNumber] || COMPANY_CONFIG[1];
    const existingFee = await prisma.invoice.findFirst({
      where: {
        studentId: student.id,
        kind: 'FEE'
      }
    });

    if (!existingFee) {
      const dueDate = new Date();
      dueDate.setDate(10);
      if (dueDate < new Date()) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      await prisma.invoice.create({
        data: {
          studentId: student.id,
          amount: item.monthlyRent,
          rentAmount: item.monthlyRent - 3000,
          messAmount: 3000,
          electricityAmount: 0,
          dueDate: dueDate,
          status: 'UNPAID',
          floorNumber: room.floorNumber,
          companyName: floorConfig.companyName,
          kind: 'FEE'
        }
      });
      console.log(`  + Generated initial monthly fee invoice: ₹${item.monthlyRent}`);
    }

    // 6. Ensure Security Deposit Invoice exists
    const existingDeposit = await prisma.invoice.findFirst({
      where: {
        studentId: student.id,
        kind: 'CHARGE',
        category: 'DEPOSIT'
      }
    });

    if (!existingDeposit) {
      await prisma.invoice.create({
        data: {
          studentId: student.id,
          amount: item.securityDeposit,
          dueDate: item.dateOfJoining || new Date(),
          status: 'PAID', // Security deposit paid on admission
          paidAt: item.dateOfJoining || new Date(),
          floorNumber: room.floorNumber,
          companyName: floorConfig.companyName,
          kind: 'CHARGE',
          category: 'DEPOSIT',
          title: 'Security Deposit',
          note: `Security deposit of ₹${item.securityDeposit} paid on joining`,
          payMethod: 'CASH'
        }
      });
      console.log(`  + Recorded Security Deposit receipt: ₹${item.securityDeposit} (PAID)`);
    }

    results.push({
      name: item.name,
      roomNumber: item.roomNumber,
      phone: item.phoneNumber,
      email: item.email,
      rent: item.monthlyRent,
      deposit: item.securityDeposit
    });
  }

  console.log(`\n🎉 Successfully processed all ${results.length} admission forms.`);
  return results;
}

module.exports = {
  ADMISSION_STUDENTS,
  importAdmissionForms
};
