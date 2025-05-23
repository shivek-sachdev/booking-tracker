-- Create tour_package_booking_linked_bookings table for many-to-many relationship
-- between tour package bookings and ticket bookings

CREATE TABLE IF NOT EXISTS tour_package_booking_linked_bookings (
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

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tour_package_booking_linked_bookings_tour_package_booking_id 
    ON tour_package_booking_linked_bookings(tour_package_booking_id);

CREATE INDEX IF NOT EXISTS idx_tour_package_booking_linked_bookings_booking_id 
    ON tour_package_booking_linked_bookings(booking_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tour_package_booking_linked_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tour_package_booking_linked_bookings_updated_at
    BEFORE UPDATE ON tour_package_booking_linked_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_tour_package_booking_linked_bookings_updated_at();

-- Migrate existing data from linked_booking_id field
-- Insert records for existing tour package bookings that have linked_booking_id
INSERT INTO tour_package_booking_linked_bookings (tour_package_booking_id, booking_id)
SELECT id, linked_booking_id
FROM tour_package_bookings
WHERE linked_booking_id IS NOT NULL
ON CONFLICT (tour_package_booking_id, booking_id) DO NOTHING;

-- Note: We keep the linked_booking_id column for now to ensure backwards compatibility
-- It can be dropped later after confirming the migration is successful 