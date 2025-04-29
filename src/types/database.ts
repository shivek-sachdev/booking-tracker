export interface Customer {
  id: string; // uuid
  company_name: string;
  created_at: string; // timestamp with time zone
}

export interface PredefinedSector {
  id: string; // uuid
  origin_code: string;
  destination_code: string;
  description?: string | null;
  created_at: string; // timestamp with time zone
}

export type BookingType = 'One-Way' | 'Return';
export type BookingStatus = 'Confirmed' | 'Waiting List' | 'Ticketed' | 'Cancelled' | 'Pending' | 'Unconfirmed';

export interface FareClass {
  id: string; // uuid
  name: string;
  description?: string | null;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

export interface Booking {
  id: string; // uuid
  customer_id: string; // uuid
  booking_reference: string;
  booking_type: BookingType;
  num_pax: number;
  deadline?: string | null; // date
  status: BookingStatus;
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  // We might want to join customer data later
  customers?: Pick<Customer, 'company_name'> | null; // Example of joined data
}

export interface BookingSector {
  id: string; // uuid
  booking_id: string; // uuid
  predefined_sector_id: string; // uuid
  travel_date: string; // Added (date as string from DB)
  status: BookingStatus;
  fare_class_id?: string | null; // uuid, Added
  flight_number?: string | null;
  num_pax: number; // Added: number of passengers for this specific sector
  created_at: string; // timestamp with time zone
  // We might want to join sector data later
  predefined_sectors?: Pick<PredefinedSector, 'origin_code' | 'destination_code'> | null; // Example
}

// Utility type for Supabase RPC results (if needed later)
export interface CountResult {
  status: BookingStatus;
  count: number;
} 