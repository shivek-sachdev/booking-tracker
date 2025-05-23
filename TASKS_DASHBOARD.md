# Tasks Dashboard

## Overview
Tasks Dashboard เป็น Dashboard หลักที่รวบรวมข้อมูลสำคัญของระบบ Booking Tracker ไว้ในหน้าเดียว โดยมีการแสดงข้อมูลในรูปแบบที่เข้าใจง่ายและใช้งานสะดวก โดย**ใช้ข้อมูลจริงจากฐานข้อมูลทั้งหมด** (ยกเว้น Recent Tasks ที่ยังเป็น mock data)

## Features

### 📊 Stats Summary (Real Database Data)
แสดงสถิติโดยรวมของธุรกิจใน 4 หมวดหลัก จากข้อมูลจริง:
- **Total Revenue**: รายได้รวมจาก `grand_total` ในตาราง `tour_package_bookings`
- **Active Bookings**: จำนวนการจองที่มีสถานะ Open, Negotiating, Paid
- **Total Customers**: จำนวนลูกค้าไม่ซ้ำจาก `customer_name`
- **Completion Rate**: อัตราส่วนการจองที่มีสถานะ Complete

### 🎯 Main Dashboard Cards (Real Database Data)
แสดงข้อมูลแยกตามหมวดหมู่พร้อมการนำทางไปยังหน้าจัดการ:

#### Tour Bookings Card (Real Data)
- จำนวนการจองจริงจากตาราง `tour_package_bookings`
- แยกสถานะ: 
  - **Confirmed**: สถานะ 'Paid (Full Payment)', 'Complete'
  - **Pending**: สถานะ 'Open', 'Negotiating', 'Paid (1st installment)'
  - **Cancelled**: สถานะ 'Closed'
- คลิกเพื่อไปที่หน้า Tour Packages

#### Tour Packages Card (Real Data)
- จำนวนแพ็คเกจจริงจากตาราง `tour_products`
- แยกสถานะ:
  - **Active**: แพ็คเกจที่มีการจองแล้ว
  - **Draft**: แพ็คเกจที่ยังไม่มีการจอง
  - **Archived**: 0 (ต้องเพิ่มฟิลด์ status ในตาราง)
- คลิกเพื่อไปที่หน้า Tour Products

#### Payments Card (Real Data)
- ยอดเงินจริงจากการคำนวณ `grand_total`
- แยกสถานะ:
  - **Completed**: การจองที่ชำระเงินครบแล้ว
  - **Pending**: การจองที่ยังชำระไม่ครบ
  - **Failed**: การจองที่ถูกยกเลิก
- คลิกเพื่อไปที่หน้า Payments

### 🏆 Top Selling Packages (Real Data)
แสดงแพ็คเกจทัวร์ที่ขายดีที่สุด 5 อันดับแรกจากข้อมูลจริง:
- **Real-time Sales Data**: ดึงข้อมูลจาก `tour_package_bookings` และ `tour_products` tables
- **Package Rankings**: อันดับ 1-5 ตามจำนวน PAX ที่ขายได้
- **Sales Performance**: จำนวนการขายและรายได้จริงของแต่ละแพ็คเกจ
- **Calculated Ratings**: คะแนนคำนวณตามยอดขาย
- **Dynamic Growth**: เปอร์เซ็นต์การเติบโตคำนวณแบบ dynamic
- **Progress Visualization**: แสดงความนิยมสัมพัทธ์ด้วย progress bar
- **Smart Destination Detection**: ดึงจุดหมายปลายทางจากชื่อแพ็คเกจหรือคำอธิบาย

### 📝 Recent Tasks (Mock Data)
แสดงรายการ Task ล่าสุด 5 รายการ พร้อม:
- ชื่อและรายละเอียดของ Task
- Badge แสดงระดับความสำคัญ (Priority)
- Badge แสดงสถานะ (Status)
- ปุ่ม "View All Tasks" เพื่อดู Task ทั้งหมด
- **หมายเหตุ**: ยังใช้ mock data เพราะยังไม่มีตาราง tasks

## Data Sources

### Real Database Integration
Dashboard ดึงข้อมูลจากตารางในฐานข้อมูลจริง:

#### Dashboard Stats Data
```sql
-- Stats Summary ดึงข้อมูลจาก:
SELECT grand_total, status, customer_name, created_at
FROM tour_package_bookings
```

#### Tour Bookings Stats
```sql
-- นับและแยกตามสถานะ
SELECT status, COUNT(*) 
FROM tour_package_bookings 
GROUP BY status
```

#### Tour Packages Stats
```sql
-- ดึงข้อมูลแพ็คเกจและตรวจสอบการจอง
SELECT tp.*, COUNT(tpb.id) as booking_count
FROM tour_products tp
LEFT JOIN tour_package_bookings tpb ON tp.id = tpb.tour_product_id
GROUP BY tp.id
```

#### Payments Stats
```sql
-- คำนวณยอดเงินตามสถานะ
SELECT status, SUM(grand_total) as total_amount
FROM tour_package_bookings
GROUP BY status
```

#### Top Selling Packages Data
```sql
-- ดึงข้อมูลการขายจริงจากฐานข้อมูล
SELECT 
  tour_product_id,
  grand_total,
  pax,
  status,
  created_at,
  tour_products (id, name, description)
FROM tour_package_bookings
```

#### การคำนวณที่ใช้:
- **Total Revenue**: รวม `grand_total` ทั้งหมด
- **Active Bookings**: นับสถานะ Open, Negotiating, Paid
- **Total Customers**: นับ `customer_name` ที่ไม่ซ้ำ
- **Completion Rate**: (สถานะ Complete / รวมทั้งหมด) × 100
- **Sales Volume**: รวม `pax` ตาม `tour_product_id`
- **Revenue**: รวม `grand_total` ตาม `tour_product_id`
- **Ranking**: เรียงลำดับตาม sales volume สูงสุด
- **Progress Value**: คำนวณเป็นเปอร์เซ็นต์เทียบกับแพ็คเกจอันดับ 1
- **Rating Calculation**: `4.0 + (sales / 100) * 0.8` (max 5.0)

## Navigation

### หน้าหลัก
- `/tasks` - Tasks Dashboard (หน้านี้)

### หน้าย่อย
- `/tasks/all` - รายการ Task ทั้งหมด
- `/tasks/new` - สร้าง Task ใหม่
- `/tasks/[id]` - ดูรายละเอียด Task

### หน้าที่เชื่อมโยง
- `/tour-packages` - จัดการการจองทัวร์
- `/tour-products` - จัดการแพ็คเกจทัวร์
- `/payments` - จัดการการชำระเงิน
- `/customers/new` - เพิ่มลูกค้าใหม่
- `/reports` - รายงาน
- `/calendar` - ปฏิทินทัวร์

## Components

### Main Components
- `src/app/tasks/page.tsx` - หน้า Tasks Dashboard หลัก (ใช้ข้อมูลจริง)
- `src/app/tasks/all/page.tsx` - หน้ารายการ Task ทั้งหมด

### Sub Components
- `src/components/tasks/top-selling-packages.tsx` - Top Selling Packages component (async server component, real data)
- `src/components/tasks/stats-summary.tsx` - Stats Summary component (async server component, real data)
- `src/components/tasks/tasks-display-controls.tsx` - ตารางแสดง Task (ใช้ในหน้า /tasks/all)

### Database Actions
- `src/lib/actions/dashboard-stats.ts` - ฟังก์ชันใหม่สำหรับ dashboard statistics
  - `getDashboardStats()` - ดึงข้อมูล stats summary
  - `getTourBookingsStats()` - ดึงข้อมูล tour bookings
  - `getTourPackagesStats()` - ดึงข้อมูล tour packages  
  - `getPaymentsStats()` - ดึงข้อมูล payments
- `src/lib/actions/tour-products.ts` - ฟังก์ชัน `getTopSellingPackages()` เพื่อดึงข้อมูลการขาย

## Design Features

### Responsive Design
- Mobile-first approach
- Grid layout ปรับตามขนาดหน้าจอ
- Touch-friendly interface

### Interactive Elements
- Hover effects บน cards และปุ่ม
- Smooth transitions
- Arrow animations เมื่อ hover
- Progress bars แสดงความนิยม
- Real-time data updates

### Color Coding
- 🟢 สีเขียว: สถานะดี, เพิ่มขึ้น
- 🟡 สีเหลือง: สถานะรอดำเนินการ, rating stars
- 🔴 สีแดง: สถานะยกเลิก, ลดลง
- 🔵 สีน้ำเงิน: ข้อมูลหลัก
- 👑 สีทอง: แพ็คเกจอันดับ 1

## Data Structure

### Real Database Schema
ใช้ข้อมูลจริงจากฐานข้อมูล Supabase:

#### Dashboard Stats Interface
```typescript
export interface DashboardStats {
  totalRevenue: number;        // จาก grand_total
  revenueChange: string;       // เปอร์เซ็นต์เพิ่มขึ้น
  activeBookings: number;      // นับสถานะ active
  bookingsChange: string;      // เปอร์เซ็นต์เพิ่มขึ้น
  totalCustomers: number;      // นับลูกค้าไม่ซ้ำ
  customersChange: string;     // เปอร์เซ็นต์เพิ่มขึ้น
  completionRate: number;      // อัตราส่วน Complete
  completionChange: string;    // เปอร์เซ็นต์เพิ่มขึ้น
}
```

#### Tour Bookings Stats Interface
```typescript
export interface TourBookingsStats {
  total: number;               // จำนวนรวม
  confirmed: number;           // สถานะ confirmed
  pending: number;             // สถานะ pending  
  cancelled: number;           // สถานะ cancelled
  change: string;              // เปอร์เซ็นต์เพิ่มขึ้น
}
```

#### Tour Packages Stats Interface
```typescript
export interface TourPackagesStats {
  total: number;               // จำนวนแพ็คเกจรวม
  active: number;              // แพ็คเกจที่มีการจอง
  draft: number;               // แพ็คเกจที่ไม่มีการจอง
  archived: number;            // แพ็คเกจที่ถูก archive
  change: string;              // เปอร์เซ็นต์เพิ่มขึ้น
}
```

#### Payments Stats Interface
```typescript
export interface PaymentsStats {
  total: string;               // ยอดรวม formatted
  completed: string;           // ยอดที่ชำระแล้ว formatted
  pending: string;             // ยอดรอชำระ formatted
  failed: string;              // ยอดที่ล้มเหลว formatted
  change: string;              // เปอร์เซ็นต์เพิ่มขึ้น
  totalAmount: number;         // ยอดรวม raw number
  completedAmount: number;     // ยอดที่ชำระแล้ว raw
  pendingAmount: number;       // ยอดรอชำระ raw
  failedAmount: number;        // ยอดที่ล้มเหลว raw
}
```

#### Top Selling Packages Interface
```typescript
export interface TopSellingPackage {
  id: string;
  name: string;
  destination: string;
  sales: number;           // จำนวน PAX รวม
  revenue: number;         // รายได้รวม (grand_total)
  rating: number;          // คะแนนคำนวณ
  growth: string;          // เปอร์เซ็นต์การเติบโต
  progressValue: number;   // ค่าเปอร์เซ็นต์สำหรับ progress bar
}
```

### Integration Points
- `getDashboardStats()` - ดึงข้อมูล dashboard stats จากฐานข้อมูลจริง
- `getTourBookingsStats()` - ดึงข้อมูล tour bookings stats จากฐานข้อมูลจริง
- `getTourPackagesStats()` - ดึงข้อมูล tour packages stats จากฐานข้อมูลจริง
- `getPaymentsStats()` - ดึงข้อมูล payments stats จากฐานข้อมูลจริง
- `getTopSellingPackages()` - ดึงข้อมูล Top Selling Packages จากฐานข้อมูลจริง
- Future: Tasks API สำหรับ Recent Tasks section

## Performance Features

### Server-Side Rendering
- ทุก component เป็น async server component
- ข้อมูลถูก fetch ที่ server ก่อนส่งไปยัง client
- ลดเวลา loading และปรับปรุง SEO

### Database Optimization
- ใช้ JOIN query เพื่อดึงข้อมูล tour_products พร้อมกับ bookings
- Sort และ filter ที่ระดับฐานข้อมูล
- Limit ผลลัพธ์เป็น Top 5 เพื่อประสิทธิภาพ
- การคำนวณที่เหมาะสมเพื่อลด database load

## Real vs Mock Data Status

### ✅ Real Database Data (เสร็จสิ้น)
- Stats Summary (4 metrics)
- Tour Bookings Card 
- Tour Packages Card
- Payments Card
- Top Selling Packages

### ⏳ Mock Data (รอพัฒนา)
- Recent Tasks (ต้องสร้างตาราง tasks)

## Future Enhancements
- สร้างตาราง tasks สำหรับ Recent Tasks section
- Real-time data updates ด้วย WebSocket
- การแจ้งเตือน (Notifications)
- Charts และ graphs สำหรับ sales analytics
- Export ข้อมูล sales reports
- ฟิลเตอร์และการค้นหาแบบละเอียด
- Dashboard customization
- Integration กับระบบ analytics
- Sales forecasting จากข้อมูลจริง
- Customer behavior insights
- Historical data comparison เพื่อคำนวณ growth percentages ที่แม่นยำ
- Real rating system จากลูกค้า
- Performance monitoring และ caching strategy 