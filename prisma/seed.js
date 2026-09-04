/**
 * prisma/seed.js
 *
 * Seeds the database with demo data for the academic prototype:
 *  - 1 admin user
 *  - several vehicles
 *  - sample police stations (Bengaluru area, fictional placement)
 *  - sample hospitals
 *  - a batch of normal-driving sensor readings
 *  - one sample historical accident with snapshots + notifications
 *
 * No real people's personal data is used — all names/numbers are
 * fictional placeholders for demonstration purposes only.
 *
 * Run with: npm run prisma:seed  (from backend/) or `node prisma/seed.js`
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // -------------------------------------------------------------
  // Clean existing data (order matters due to FK constraints)
  // -------------------------------------------------------------
  await prisma.notification.deleteMany();
  await prisma.accidentSensorSnapshot.deleteMany();
  await prisma.accident.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.policeStation.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.user.deleteMany();

  // -------------------------------------------------------------
  // Admin user
  // -------------------------------------------------------------
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@smartvehicle.local',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log(`Created admin user: ${admin.email} (password: Admin@123)`);

  // -------------------------------------------------------------
  // Vehicles
  // -------------------------------------------------------------
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        registrationNumber: 'KA-01-AB-1234',
        model: 'Maruti Suzuki Swift',
        ownerName: 'Demo Owner One',
        ownerPhone: '+91-9000000001',
        deviceId: 'ESP32-DEV-001',
        status: 'ACTIVE',
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'KA-05-CD-5678',
        model: 'Hyundai Creta',
        ownerName: 'Demo Owner Two',
        ownerPhone: '+91-9000000002',
        deviceId: 'ESP32-DEV-002',
        status: 'ACTIVE',
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'KA-03-EF-9012',
        model: 'Honda City',
        ownerName: 'Demo Owner Three',
        ownerPhone: '+91-9000000003',
        deviceId: 'ESP32-DEV-003',
        status: 'ACTIVE',
      },
    }),
    prisma.vehicle.create({
      data: {
        registrationNumber: 'KA-02-GH-3456',
        model: 'Tata Nexon',
        ownerName: 'Demo Owner Four',
        ownerPhone: '+91-9000000004',
        deviceId: null,
        status: 'INACTIVE',
      },
    }),
  ]);
  console.log(`Created ${vehicles.length} vehicles`);

  // -------------------------------------------------------------
  // Police stations (Bengaluru-area demo coordinates)
  // -------------------------------------------------------------
  const policeStations = await Promise.all([
    prisma.policeStation.create({
      data: {
        name: 'MG Road Police Station (Demo)',
        address: 'MG Road, Bengaluru, Karnataka',
        phone: '+91-80-25580001',
        latitude: 12.9758,
        longitude: 77.6045,
      },
    }),
    prisma.policeStation.create({
      data: {
        name: 'Koramangala Police Station (Demo)',
        address: 'Koramangala, Bengaluru, Karnataka',
        phone: '+91-80-25580002',
        latitude: 12.9352,
        longitude: 77.6245,
      },
    }),
    prisma.policeStation.create({
      data: {
        name: 'Whitefield Police Station (Demo)',
        address: 'Whitefield, Bengaluru, Karnataka',
        phone: '+91-80-25580003',
        latitude: 12.9698,
        longitude: 77.7500,
      },
    }),
    prisma.policeStation.create({
      data: {
        name: 'Jayanagar Police Station (Demo)',
        address: 'Jayanagar, Bengaluru, Karnataka',
        phone: '+91-80-25580004',
        latitude: 12.9308,
        longitude: 77.5838,
      },
    }),
  ]);
  console.log(`Created ${policeStations.length} police stations`);

  // -------------------------------------------------------------
  // Hospitals (Bengaluru-area demo coordinates)
  // -------------------------------------------------------------
  const hospitals = await Promise.all([
    prisma.hospital.create({
      data: {
        name: 'City General Hospital (Demo)',
        address: 'Residency Road, Bengaluru, Karnataka',
        phone: '+91-80-26700001',
        latitude: 12.9719,
        longitude: 77.6083,
      },
    }),
    prisma.hospital.create({
      data: {
        name: 'Koramangala Multispecialty Hospital (Demo)',
        address: 'Koramangala, Bengaluru, Karnataka',
        phone: '+91-80-26700002',
        latitude: 12.9345,
        longitude: 77.6268,
      },
    }),
    prisma.hospital.create({
      data: {
        name: 'Whitefield Care Hospital (Demo)',
        address: 'Whitefield, Bengaluru, Karnataka',
        phone: '+91-80-26700003',
        latitude: 12.9715,
        longitude: 77.7480,
      },
    }),
    prisma.hospital.create({
      data: {
        name: 'Jayanagar Health Institute (Demo)',
        address: 'Jayanagar, Bengaluru, Karnataka',
        phone: '+91-80-26700004',
        latitude: 12.9280,
        longitude: 77.5810,
      },
    }),
  ]);
  console.log(`Created ${hospitals.length} hospitals`);

  // -------------------------------------------------------------
  // Normal-driving sensor readings for vehicle #1 (last ~10 min)
  // -------------------------------------------------------------
  const primaryVehicle = vehicles[0];
  const now = new Date();
  const readings = [];

  for (let i = 60; i >= 1; i--) {
    const ts = new Date(now.getTime() - i * 10000); // every 10s
    readings.push({
      vehicleId: primaryVehicle.id,
      timestamp: ts,
      speed: 35 + Math.random() * 15, // 35-50 km/h normal city driving
      accelerationX: (Math.random() - 0.5) * 0.3,
      accelerationY: (Math.random() - 0.5) * 0.3,
      accelerationZ: 0.98 + (Math.random() - 0.5) * 0.05,
      gyroscopeX: (Math.random() - 0.5) * 5,
      gyroscopeY: (Math.random() - 0.5) * 5,
      gyroscopeZ: (Math.random() - 0.5) * 5,
      latitude: 12.9716 + (Math.random() - 0.5) * 0.01,
      longitude: 77.5946 + (Math.random() - 0.5) * 0.01,
      source: 'SIMULATION',
    });
  }
  await prisma.sensorReading.createMany({ data: readings });
  console.log(`Created ${readings.length} normal-driving sensor readings`);

  // -------------------------------------------------------------
  // Sample historical accident (for dashboard demo) on vehicle #2
  // -------------------------------------------------------------
  const secondVehicle = vehicles[1];
  const accidentTime = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

  const beforeReading = await prisma.sensorReading.create({
    data: {
      vehicleId: secondVehicle.id,
      timestamp: new Date(accidentTime.getTime() - 2000),
      speed: 62,
      accelerationX: -0.2,
      accelerationY: 0.1,
      accelerationZ: 0.99,
      gyroscopeX: 2,
      gyroscopeY: 1,
      gyroscopeZ: 1,
      latitude: 12.9500,
      longitude: 77.6100,
      source: 'SIMULATION',
    },
  });

  const impactReading = await prisma.sensorReading.create({
    data: {
      vehicleId: secondVehicle.id,
      timestamp: accidentTime,
      speed: 8,
      accelerationX: -7.8,
      accelerationY: 5.2,
      accelerationZ: 3.1,
      gyroscopeX: 310,
      gyroscopeY: -280,
      gyroscopeZ: 260,
      latitude: 12.9502,
      longitude: 77.6103,
      source: 'SIMULATION',
    },
  });

  const afterReading = await prisma.sensorReading.create({
    data: {
      vehicleId: secondVehicle.id,
      timestamp: new Date(accidentTime.getTime() + 2000),
      speed: 0,
      accelerationX: 0.05,
      accelerationY: 0.02,
      accelerationZ: 0.97,
      gyroscopeX: 1,
      gyroscopeY: 0.5,
      gyroscopeZ: 0.5,
      latitude: 12.9502,
      longitude: 77.6103,
      source: 'SIMULATION',
    },
  });

  const sampleAccident = await prisma.accident.create({
    data: {
      vehicleId: secondVehicle.id,
      occurredAt: accidentTime,
      latitude: 12.9502,
      longitude: 77.6103,
      speedBeforeImpact: beforeReading.speed,
      impactSpeed: impactReading.speed,
      speedAfterImpact: afterReading.speed,
      peakAccelerationX: impactReading.accelerationX,
      peakAccelerationY: impactReading.accelerationY,
      peakAccelerationZ: impactReading.accelerationZ,
      peakGyroX: impactReading.gyroscopeX,
      peakGyroY: impactReading.gyroscopeY,
      peakGyroZ: impactReading.gyroscopeZ,
      severity: 'SEVERE',
      confidenceScore: 0.87,
      source: 'SIMULATION',
      status: 'NOTIFIED',
      nearestPoliceStationId: policeStations[0].id,
      policeDistanceKm: 1.2,
      nearestHospitalId: hospitals[0].id,
      hospitalDistanceKm: 0.9,
    },
  });

  await prisma.accidentSensorSnapshot.createMany({
    data: [
      {
        accidentId: sampleAccident.id,
        sensorReadingId: beforeReading.id,
        relativePosition: 'BEFORE',
        offsetMs: -2000,
      },
      {
        accidentId: sampleAccident.id,
        sensorReadingId: impactReading.id,
        relativePosition: 'IMPACT',
        offsetMs: 0,
      },
      {
        accidentId: sampleAccident.id,
        sensorReadingId: afterReading.id,
        relativePosition: 'AFTER',
        offsetMs: 2000,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        accidentId: sampleAccident.id,
        recipientType: 'POLICE',
        policeStationId: policeStations[0].id,
        channel: 'CONSOLE',
        status: 'SENT',
        message: `ACCIDENT ALERT\nVehicle: ${secondVehicle.registrationNumber}\nSeverity: SEVERE\nLocation: 12.9502, 77.6103`,
        sentAt: new Date(accidentTime.getTime() + 3000),
      },
      {
        accidentId: sampleAccident.id,
        recipientType: 'HOSPITAL',
        hospitalId: hospitals[0].id,
        channel: 'CONSOLE',
        status: 'SENT',
        message: `ACCIDENT ALERT\nVehicle: ${secondVehicle.registrationNumber}\nSeverity: SEVERE\nLocation: 12.9502, 77.6103`,
        sentAt: new Date(accidentTime.getTime() + 3000),
      },
    ],
  });

  console.log(`Created sample historical accident: ${sampleAccident.id}`);
  console.log('Seeding complete.');
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
