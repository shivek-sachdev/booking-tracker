-- Add updated_at trigger for tour_package_bookings table
-- This ensures updated_at is automatically updated when a record is modified

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_tour_package_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_tour_package_bookings_updated_at'
    ) THEN
        CREATE TRIGGER trigger_update_tour_package_bookings_updated_at
            BEFORE UPDATE ON tour_package_bookings
            FOR EACH ROW
            EXECUTE FUNCTION update_tour_package_bookings_updated_at();
    END IF;
END $$; 