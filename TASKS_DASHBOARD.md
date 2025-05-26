# Dashboard and Tasks - Separated Views

## Overview
Dashboard และ Tasks ได้ถูกแยกออกเป็น 2 หน้าแยกกันเพื่อการใช้งานที่ชัดเจนและมีประสิทธิภาพมากขึ้น:

### Dashboard (`/dashboard`)
หน้า Dashboard หลักที่รวบรวมข้อมูลสำคัญของระบบ Booking Tracker ไว้ในหน้าเดียว โดยมีการแสดงข้อมูลในรูปแบบที่เข้าใจง่ายและใช้งานสะดวก โดย**ใช้ข้อมูลจริงจากฐานข้อมูลทั้งหมด**

### Tasks (`/tasks`)  
หน้า Tasks ที่เน้นการจัดการ Task เท่านั้น โดยแสดง Recent Tasks และให้การเข้าถึง Task functions ต่างๆ

## Dashboard Features (`/dashboard`)

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

## Tasks Features (`/tasks`)

### 📋 All Tasks Table (Real Data)
แสดงรายการ Task ทั้งหมดในรูปแบบตารางพร้อม:
- **Task ID** และ **Description**
- **Linked Booking** - ข้อมูลการเชื่อมโยงกับ Tour Booking
- **Status** - Badge แสดงสถานะของ Task
- **Due Date** - วันที่ครบกำหนด
- **Actions** - ปุ่มสำหรับ Edit และ Delete Task
- **Filtering Options** - แสดง/ซ่อน completed tasks
- **Sorting** - เรียงลำดับตาม due date
- **Search** - ค้นหา tasks ตามคำอธิบาย

### 🎯 Task Management Features
- **Table-based Layout**: แสดง Tasks ในรูปแบบตารางที่ครอบคลุมและจัดระเบียบ
- **Complete Task Information**: แสดงข้อมูลครบถ้วนในมุมมองเดียว
- **Advanced Actions**: Edit, Delete และ Mark as Complete ได้โดยตรง
- **Responsive Design**: ปรับขนาดตามหน้าจอและอุปกรณ์
- **Real-time Updates**: ข้อมูลอัปเดตทันทีเมื่อมีการเปลี่ยนแปลง

## Navigation Structure

### หน้าหลัก
- `/dashboard` - Dashboard หลักพร้อม analytics และ overview
- `/tasks` - หน้าจัดการ Tasks เฉพาะ

### หน้าย่อย Tasks
- `/tasks/new` - สร้าง Task ใหม่
- `/tasks/[id]` - ดูรายละเอียด Task
- `/tasks/[id]/edit` - แก้ไข Task

### หน้าที่เชื่อมโยง
- `/tour-packages` - จัดการการจองทัวร์
- `/tour-products` - จัดการแพ็คเกจทัวร์
- `/payments` - จัดการการชำระเงิน
- `/customers/new` - เพิ่มลูกค้าใหม่

## Components Structure

### Dashboard Components
- `src/app/dashboard/page.tsx` - หน้า Dashboard หลัก (ใช้ข้อมูลจริง)
- `src/components/tasks/stats-summary.tsx` - Stats Summary component (async server component, real data)
- `src/components/tasks/top-selling-packages.tsx` - Top Selling Packages component (async server component, real data)

### Tasks Components
- `src/app/tasks/page.tsx` - หน้า Tasks หลัก (All Tasks Table)
- `src/components/tasks/tasks-display-controls.tsx` - ตาราง Tasks พร้อม filtering และ controls
- `src/components/tasks/tasks-table.tsx` - ตาราง Tasks core component
- `src/components/tasks/task-form.tsx` - Form สำหรับสร้าง/แก้ไข Tasks

### Navigation Components
- `src/components/layout/main-layout.tsx` - Updated navigation with separate Dashboard and Tasks menu items

## Data Sources

### Dashboard Data (Real Database Integration)
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

### Tasks Data (Real Database Integration)
Tasks หน้าดึงข้อมูลจากตาราง tasks ที่มีอยู่:

```sql
-- Recent Tasks ดึงข้อมูลจาก:
SELECT t.*, tpb.customer_name, tp.name as package_name
FROM tasks t
LEFT JOIN tour_package_bookings tpb ON t.linked_tour_booking_id = tpb.id
LEFT JOIN tour_products tp ON tpb.tour_product_id = tp.id
ORDER BY t.created_at DESC
LIMIT 8
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

## API Integration

### Dashboard API Actions
- `getDashboardStats()` - ดึงข้อมูล dashboard stats จากฐานข้อมูลจริง
- `getTourBookingsStats()` - ดึงข้อมูล tour bookings stats จากฐานข้อมูลจริง
- `getTourPackagesStats()` - ดึงข้อมูล tour packages stats จากฐานข้อมูลจริง
- `getPaymentsStats()` - ดึงข้อมูล payments stats จากฐานข้อมูลจริง
- `getTopSellingPackages()` - ดึงข้อมูล Top Selling Packages จากฐานข้อมูลจริง

### Tasks API Actions
- `getTasks()` - ดึงข้อมูล tasks จากฐานข้อมูล
- `createTask()` - สร้าง task ใหม่
- `updateTask()` - อัปเดต task
- `deleteTask()` - ลบ task
- `getPaginatedTourBookingsForLinking()` - ดึงข้อมูล tour bookings สำหรับการ link กับ task

## Performance Features

### Server-Side Rendering
- ทุก component เป็น async server component
- ข้อมูลถูก fetch ที่ server ก่อนส่งไปยัง client
- ลดเวลา loading และปรับปรุง SEO

### Database Optimization
- ใช้ JOIN query เพื่อดึงข้อมูล tour_products พร้อมกับ bookings
- Sort และ filter ที่ระดับฐานข้อมูล
- Limit ผลลัพธ์เพื่อประสิทธิภาพ
- การคำนวณที่เหมาะสมเพื่อลด database load

## Benefits of Separation

### ✅ Dashboard Benefits
- **Focus on Analytics**: เน้นการแสดงข้อมูลและสถิติ
- **Business Overview**: มุมมองภาพรวมของธุรกิจ
- **Quick Access**: ปุ่ม Quick Booking สำหรับการจองด่วน
- **Performance Metrics**: ข้อมูลสำคัญสำหรับการตัดสินใจ

### ✅ Tasks Benefits
- **Task-Focused**: เน้นการจัดการ tasks เท่านั้น
- **Better UX**: การแสดงผลที่เหมาะสมสำหรับ task management
- **Enhanced Information**: แสดงข้อมูล linked bookings ชัดเจนขึ้น
- **Improved Navigation**: การนำทางที่ชัดเจนระหว่าง task functions

### ✅ Navigation Benefits
- **Clear Separation**: แยกหน้าที่ของแต่ละส่วนชัดเจน
- **Logical Flow**: ผู้ใช้เข้าใจได้ง่ายว่าจะหาอะไรที่ไหน
- **Reduced Clutter**: หน้าแต่ละหน้าไม่ซับซ้อนเกินไป

## Interface Updates

### Dashboard Interface
```typescript
// Dashboard components maintain same interfaces
export interface DashboardStats {
  totalRevenue: number;
  activeBookings: number;
  totalCustomers: number;
  completionRate: number;
}

export interface TourBookingsStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  change: string;
}

export interface TourPackagesStats {
  total: number;
  active: number;
  draft: number;
  archived: number;
  change: string;
}

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

### Tasks Interface  
```typescript
// Tasks interfaces remain the same but with enhanced display
export interface TaskWithBookingInfo extends Record<string, any> {
  id: number;
  description: string;
  due_date?: string | null;
  status: string;
  linked_tour_booking_id?: string | null;
  created_at: string;
  updated_at: string;
  tour_package_bookings?: {
    customer_name: string | null;
    tour_products?: {
      name: string | null;
    } | null;
  } | null;
}
```

## Future Enhancements
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
- Task automation และ scheduling
- Advanced task filtering และ sorting
- Task templates สำหรับงานที่ทำซ้ำ
- Task dependencies และ workflows 