# Multiple Linked Bookings Implementation

## Overview

ระบบได้รับการอัปเดตเพื่อรองรับการลิงค์ตั๋วหลายใบต่อหนึ่งทัวร์ แทนที่จะเป็นการลิงค์ตั๋วเพียงใบเดียวเหมือนเดิม

## Database Changes

### 1. New Table: `tour_package_booking_linked_bookings`

สร้างตารางใหม่สำหรับเก็บ many-to-many relationship ระหว่างทัวร์กับตั๋ว:

```sql
CREATE TABLE tour_package_booking_linked_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_package_booking_id VARCHAR(5) NOT NULL,
    booking_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_tour_package_booking_linked_bookings_tour_package_booking_id 
        FOREIGN KEY (tour_package_booking_id) 
        REFERENCES tour_package_bookings(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_tour_package_booking_linked_bookings_booking_id 
        FOREIGN KEY (booking_id) 
        REFERENCES bookings(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate links
    CONSTRAINT uq_tour_package_booking_linked_bookings_tour_booking 
        UNIQUE (tour_package_booking_id, booking_id)
);
```

### 2. Migration Strategy

- ตารางใหม่มี indexes สำหรับ performance ที่ดี
- Migration script ย้ายข้อมูลเดิมจาก `linked_booking_id` field ไปยังตารางใหม่
- เก็บ `linked_booking_id` field ไว้ชั่วคราวเพื่อ backwards compatibility

## Code Changes

### 1. Types และ Interfaces

#### ใน `src/types/database.ts`:
```typescript
export interface TourPackageBookingLinkedBooking {
  id: string; // uuid
  tour_package_booking_id: string; // varchar(5)
  booking_id: string; // uuid
  created_at: string;
  updated_at: string;
}
```

#### ใน `src/lib/types/tours.ts`:
```typescript
export interface LinkedBookingInfo {
  id: string; // booking_id (UUID)
  booking_reference: string | null;
  customer_name: string | null;
  earliest_travel_date: string | null;
  status: string | null;
  created_at: string;
}

export interface TourPackageBookingWithProduct extends TourPackageBooking {
  tour_products: { name: string } | null;
  linked_booking_pnr?: string | null; // Keep for backwards compatibility
  linked_bookings?: LinkedBookingInfo[] | null; // NEW: Array of linked bookings
}
```

### 2. Server Actions

#### ใน `src/lib/actions/tour-package-bookings.ts`:

เพิ่มฟังก์ชันใหม่:
- `addLinkedBooking(tourPackageBookingId, bookingId)` - เพิ่มการลิงค์ตั๋ว
- `removeLinkedBooking(tourPackageBookingId, bookingId)` - ลบการลิงค์ตั๋ว
- `getLinkedBookings(tourPackageBookingId)` - ดึงข้อมูลตั๋วที่ลิงค์ไว้ทั้งหมด

อัปเดตฟังก์ชัน:
- `getTourPackageBookingById()` - ดึงข้อมูล linked bookings จากตารางใหม่

### 3. UI Components

#### Modal Component (`src/components/tour-packages/linked-booking-selection-modal.tsx`):

**เปลี่ยนแปลงหลัก:**
- เปลี่ยนจาก single selection เป็น multi-selection ด้วย checkboxes
- เพิ่ม "Select All" checkbox
- เพิ่มแสดงจำนวนตั๋วที่เลือกไว้
- เปลี่ยน interface:
  ```typescript
  // เดิม
  onSelectBooking: (booking: LinkedBookingSelectItem) => void;
  currentLinkedBookingId?: string | null;
  
  // ใหม่
  onSelectBookings: (bookings: LinkedBookingSelectItem[]) => void;
  currentLinkedBookingIds?: string[];
  ```

#### Form Component (`src/app/tour-packages/components/tour-package-booking-form.tsx`):

**เปลี่ยนแปลงหลัก:**
- เปลี่ยน state จาก single booking เป็น array:
  ```typescript
  // เดิม
  const [selectedLinkedBookingRef, setSelectedLinkedBookingRef] = useState<string | null>(null);
  
  // ใหม่
  const [linkedBookings, setLinkedBookings] = useState<LinkedBookingInfo[]>([]);
  ```

- UI ใหม่แสดงรายการตั๋วที่ลิงค์ไว้ทั้งหมด พร้อมปุ่มลบแต่ละตั๋ว
- เปลี่ยนจาก "Select Ticket Booking" เป็น "Link Ticket Bookings" / "Add More Bookings"

## Features

### 1. การเลือกตั๋วหลายใบ
- ผู้ใช้สามารถเลือกตั๋วหลายใบพร้อมกันใน modal
- มี checkbox สำหรับเลือกทั้งหมดในหน้าปัจจุบัน
- แสดงจำนวนตั๋วที่เลือกไว้

### 2. การจัดการตั๋วที่ลิงค์ไว้
- แสดงรายการตั๋วทั้งหมดที่ลิงค์ไว้
- สามารถลบตั๋วแต่ละใบได้โดยไม่กระทบตั๋วอื่น
- สามารถเพิ่มตั๋วเพิ่มเติมได้

### 3. Backwards Compatibility
- ระบบยังรองรับ `linked_booking_id` field เดิม
- ข้อมูลเดิมจะถูก migrate ไปยังตารางใหม่
- ไม่กระทบการทำงานของระบบเดิม

## Usage

### สำหรับผู้ใช้งาน:

1. **เพิ่มตั๋วที่ลิงค์:**
   - คลิก "Link Ticket Bookings" หรือ "Add More Bookings"
   - เลือกตั๋วที่ต้องการ (สามารถเลือกหลายใบ)
   - คลิก "Link Selected (n)"

2. **ลบตั๋วที่ลิงค์:**
   - คลิกปุ่ม X ข้างตั๋วที่ต้องการลบ
   - ตั๋วจะถูกลบออกจากการลิงค์

### สำหรับผู้พัฒนา:

```typescript
// ดึงข้อมูลตั๋วที่ลิงค์ไว้
const { linkedBookings, error } = await getLinkedBookings(tourPackageBookingId);

// เพิ่มการลิงค์ตั๋ว
const result = await addLinkedBooking(tourPackageBookingId, bookingId);

// ลบการลิงค์ตั๋ว
const result = await removeLinkedBooking(tourPackageBookingId, bookingId);
```

## Security Considerations

- ใช้ foreign key constraints เพื่อป้องกันข้อมูลไม่สอดคล้อง
- Unique constraint ป้องกันการลิงค์ตั๋วเดียวซ้ำ
- CASCADE DELETE เมื่อทัวร์หรือตั๋วถูกลบ

## Performance

- สร้าง indexes บน foreign key columns
- ใช้ pagination ใน modal เพื่อจัดการข้อมูลจำนวนมาก
- Debounce search เพื่อลด API calls

## Testing

เพื่อทดสอบระบบ:

1. สร้างทัวร์ใหม่
2. ลิงค์ตั๋วหลายใบ
3. ตรวจสอบว่าข้อมูลแสดงถูกต้อง
4. ลบตั๋วบางใบ
5. เพิ่มตั๋วเพิ่มเติม
6. ตรวจสอบ backwards compatibility กับข้อมูลเดิม 