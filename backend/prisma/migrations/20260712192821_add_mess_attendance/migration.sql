-- CreateTable
CREATE TABLE "MessAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedBy" TEXT NOT NULL,
    CONSTRAINT "MessAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
