# Product Requirements Document: Booking Tracker Application

**1. Introduction**

*   **1.1 Purpose:** This document outlines the requirements for the Booking Tracker application. The application aims to provide a centralized platform for managing travel bookings, associated customer data, deadlines, and key performance metrics. It serves as an internal tool to improve operational efficiency and visibility into the booking process.
*   **1.2 Scope:** The current scope includes user authentication, a central dashboard displaying key metrics and urgent tasks (deadlines), and likely sections for managing bookings, customers, and potentially fares/sectors (inferred from directory structure). **It also includes dedicated functionality for managing Tour Package bookings, their associated Tour Products, payment tracking, and detailed pricing with add-ons.**
*   **1.3 Target Audience:** Internal users such as booking agents, operations managers, or administrators responsible for overseeing and managing travel reservations **(both standard bookings and tour packages)**.

**2. Goals**

*   **2.1 Business Goals:**
    *   Improve the efficiency of managing booking deadlines.
    *   Provide a clear, real-time overview of booking activity and status.
    *   Centralize customer booking information.
    *   Track key performance indicators related to bookings.
*   **2.2 User Goals:**
    *   Quickly identify bookings requiring immediate attention (past or upcoming deadlines).
    *   Easily view overall booking statistics and trends.
    *   Access information about specific bookings, customers, and potentially fares.
    *   Securely log in and access relevant data.

**3. User Roles & Personas**

*   **3.1 Booking Agent/Manager:** Primary user responsible for viewing the dashboard, managing bookings (implied), tracking deadlines, and possibly customer interactions.
*   **3.2 Administrator (Optional/Future):** Might have broader access for user management or system configuration (not explicitly observed).

**4. Functional Requirements**

*   **4.1 Authentication:**
    *   `FR-AUTH-01`: Users must be able to log in securely to access the application (inferred from `src/app/login` and `src/app/auth`). Supabase Auth is likely used.
    *   `FR-AUTH-02`: The system should protect routes, ensuring only authenticated users can access the main application features (dashboard, etc.).
*   **4.2 Dashboard (`src/app/page.tsx`):**
    *   `FR-DASH-01`: The dashboard shall display key performance indicators (KPIs) including:
        *   Total number of bookings.
        *   Breakdown of bookings by status (e.g., Confirmed, Pending, Cancelled, Unconfirmed).
        *   Total number of unique customers.
    *   `FR-DASH-02`: The dashboard shall display booking activity trends, specifically the number of bookings created over the last 7 days.
    *   `FR-DASH-03`: The dashboard shall display a list of top customers ranked by booking volume, showing the count and percentage contribution for each.
    *   `FR-DASH-04`: The dashboard shall display a prioritized list of bookings with deadlines that are past due, due today, or due tomorrow.
    *   `FR-DASH-05`: The deadline list shall include: Booking Reference, Customer Name, Earliest/Latest Travel Dates, Booking Status, and a clear Deadline Status indicator (e.g., "Overdue", "Due Today", "Due Tomorrow").
    *   `FR-DASH-06`: The deadline list shall exclude 'Cancelled' bookings and only include statuses like 'Confirmed' or 'Waiting List'.
    *   `FR-DASH-07`: Data displayed on the dashboard should be fetched dynamically from the backend (Supabase).
*   **4.3 Booking Management (Inferred from `src/app/bookings`):**
    *   `FR-BOOK-01`: Users should likely be able to view a list of all bookings.
    *   `FR-BOOK-02`: Users should likely be able to view the details of a specific booking.
    *   `FR-BOOK-03`: Users might be able to create, update, or delete bookings (CRUD operations - *needs confirmation by reviewing `src/app/bookings`*).
*   **4.4 Customer Management (Inferred from `src/app/customers`):**
    *   `FR-CUST-01`: Users should likely be able to view a list of customers.
    *   `FR-CUST-02`: Users should likely be able to view details associated with a specific customer, potentially including their booking history.
    *   `FR-CUST-03`: Users might be able to manage customer records (CRUD - *needs confirmation*).
*   **4.5 Fare Management (Inferred from `src/app/fares`):**
    *   `FR-FARE-01`: The system likely provides functionality to view or manage fare information (*needs confirmation*).
*   **4.6 Sector Management (Inferred from `src/app/sectors`):**
    *   `FR-SECT-01`: The system likely provides functionality related to booking sectors (e.g., flight legs, hotel stays) (*needs confirmation*).
*   **4.7 Tour Product Management:**
    *   `FR-TPRD-01`: Users shall be able to Create, Read, Update, and Delete (CRUD) entries in a master list of "Tour Products".
    *   `FR-TPRD-02`: Each Tour Product should have at least a name/title and potentially other relevant details (e.g., description, default duration - TBD).
    *   `FR-TPRD-03`: A dedicated section/page shall exist for managing Tour Products.
*   **4.8 Tour Package Booking Management:**
    *   `FR-TPKG-01`: Users shall be able to Create, Read, Update, and Delete (CRUD) Tour Package bookings, each identified by a unique ID.
    *   `FR-TPKG-02`: When creating/editing a Tour Package booking, users must be able to select a "Tour Product" from the master list defined in FR-TPRD-01.
    *   `FR-TPKG-03`: Users must be able to manually enter the **base price per person (`base_price_per_pax`)** for the selected Tour Product within the specific booking record.
    *   `FR-TPKG-03a`: Users shall be able to add, edit, and remove custom add-on line items to a Tour Package booking. Each add-on shall have a name and an amount.
    *   `FR-TPKG-03b`: The system shall automatically calculate the `total_per_pax` by summing the `base_price_per_pax` and the amounts of all associated add-on items.
    *   `FR-TPKG-03c`: The system shall automatically calculate the `grand_total` by multiplying the `total_per_pax` by the number of participants (`pax`) for the booking. (Requires a `number_of_pax` field in the booking).
    *   `FR-TPKG-03d`: The `base_price_per_pax`, the list/array of `addons` (including their names and amounts, likely stored as JSONB), the calculated `total_per_pax`, and the calculated `grand_total` shall be stored in the database for each tour package booking.
    *   `FR-TPKG-03e`: The booking creation/edit form and the booking detail view shall display the `base_price_per_pax`, a clear list of all add-ons with their individual amounts, the `total_per_pax`, and the `grand_total`.
    *   `FR-TPKG-04`: Users must be able to enter the customer's name as free-form text directly into the Tour Package booking record (no mandatory link to the main `Customers` table).
    *   `FR-TPKG-05`: Tour Package bookings should include relevant dates (e.g., booking date, travel start/end dates) and potentially a status (including Open, Negotiating, Paid (1st Installment), Paid (Full Payment), Complete, Closed).
    *   `FR-TPKG-06`: A dedicated section/page shall exist for managing Tour Package bookings.
    *   `FR-TPKG-07`: Each Tour Package booking must have a unique, system-generated or user-provided (if system generation isn't implemented) 5-character alphanumeric identifier (ID).
    *   `FR-TPKG-08`: When editing a Tour Package booking, if the status is changed to a payment-related status (e.g., `Paid (1st Installment)`, `Paid (Full Payment)`) **and a payment record for that specific status does not already exist**, a file input field shall appear, allowing the user to upload a corresponding payment slip image/document.
    *   `FR-TPKG-09`: Uploaded payment slips shall be stored securely (e.g., using Supabase Storage).
    *   `FR-TPKG-10`: A separate `payments` table shall record payment events, linking to the `tour_package_bookings` table and storing the status at the time of payment, the path to the uploaded slip in storage, and the upload timestamp.
    *   `FR-TPKG-11`: When editing a Tour Package booking, if a payment record **already exists** for the selected payment-related status, a \"View Slip\" button shall be displayed instead of the file input field, allowing the user to view the previously uploaded slip.
    *   `FR-TPKG-12`: The Tour Package booking detail page shall include a \"Payments\" tab displaying a history of recorded payments for that booking.
    *   `FR-TPKG-13`: Each payment record displayed (on the detail page and the Payments Ledger) shall include the upload date, the status associated with the payment, a link/button to view the slip (using a secure, time-limited Signed URL), and a button to delete the payment record (which also deletes the file from storage).
    *   `FR-TPKG-14`: The \"Linked Booking Ref\" dropdown on the edit form should only be visible when the status is not \'Open\'.
*   **4.9 Payments Ledger:**
    *   `FR-PAYL-01`: A dedicated page/section titled \"Payments\" shall be accessible via the main sidebar navigation.
    *   `FR-PAYL-02`: This page shall display a ledger (table) of all payment records from the `payments` table.
    *   `FR-PAYL-03`: The ledger shall display, at minimum: Upload Date, Customer Name (from the linked booking), Tour Booking ID (linked to the booking detail page), Package Name (from the linked tour product), Status at Payment, and an Action button area (containing View Slip and potentially Delete, although Delete might be restricted).
    *   `FR-PAYL-04`: Payment records shall be displayed in reverse chronological order (newest first) based on the upload date.
    *   `FR-PAYL-05`: The data required for the ledger (joining payments, bookings, and products) shall be fetched via a dedicated server action.

**5. Non-Functional Requirements**

*   **5.1 Performance:**
    *   `NFR-PERF-01`: The application should load quickly, utilizing Next.js features like React Server Components (RSC) for efficient data fetching and rendering.
    *   `NFR-PERF-02`: Database queries (Supabase) should be optimized for speed.
*   **5.2 Usability:**
    *   `NFR-USAB-01`: The user interface should be clean, intuitive, and easy to navigate. (Leverages Shadcn UI).
    *   `NFR-USAB-02`: The application must be responsive and function correctly on various screen sizes (mobile-first approach with Tailwind CSS).
    *   `NFR-USAB-03`: The main sidebar navigation shall visually separate standard booking management (`Fares`, `Customers`, `Bookings`, `Sectors`) from tour package management (`Tour Packages`, `Tour Products`) using a distinct separator (e.g., a horizontal line).
    *   `NFR-USAB-04`: The main sidebar shall include an easily accessible logout button, allowing users to securely end their session.
    *   `NFR-USAB-05`: The main sidebar navigation shall include a link to the dedicated \"Payments\" ledger page.
    *   `NFR-USAB-06`: After successfully updating a Tour Package booking via the edit form, the user shall be redirected back to the Tour Package listing page.
    *   `NFR-USAB-07`: Status badges within the Tour Package booking list shall be color-coded for quick visual differentiation of statuses (e.g., 'Open' - blue, 'Negotiating' - yellow, 'Paid' - green, 'Complete' - purple, 'Closed' - gray).
*   **5.3 Reliability:**
    *   `NFR-RELI-01`: The application should handle errors gracefully (e.g., display informative messages if data fetching fails). Next.js `error.tsx` conventions should be used.
    *   `NFR-RELI-02`: Loading states should be indicated clearly to the user while data is being fetched (Next.js `loading.tsx`).
*   **5.4 Security:**
    *   `NFR-SECU-01`: User authentication must be secure.
    *   `NFR-SECU-02`: Access to data should be properly controlled (potentially via Supabase Row Level Security - RLS, *assumption*).
*   **5.5 Maintainability:**
    *   `NFR-MAIN-01`: Code should follow established conventions (TypeScript, functional components, clear structure as per custom instructions).
    *   `NFR-MAIN-02`: Dependencies should be managed clearly (`package.json`).

**6. Data Model (High-Level)**

Based on `src/app/page.tsx` and directory structure:

*   **Bookings:** Contains booking reference, status, deadline, links to customer and sectors, timestamps.
*   **Customers:** Contains company name, potentially contact details, and other identifiers.
*   **Booking Sectors:** Details about specific parts of a booking (e.g., flights, hotels), including travel dates.
*   **Users:** For authentication (managed by Supabase Auth).
*   **Fares (Implied):** Details about pricing or fare rules.
*   **Tour Products:** Master list of available tour packages (e.g., name, description).
*   **Tour Package Bookings:** Records of specific tour package sales, linking to a Tour Product, storing the entered customer name, **`base_price_per_pax`, an array/JSONB of `addons` (each with name and amount), calculated `total_per_pax`, calculated `grand_total`, number of `pax` (participants)**, dates, and status. Each record has a unique 5-character alphanumeric ID. May include a link to a standard booking (`linked_booking_id`). Payment slips are stored in Supabase Storage and referenced in a separate `payments` table.
*   **Payments:** Records linking a tour package booking to an uploaded payment slip, including the booking status at the time of payment and an upload timestamp.

**7. Technology Stack**

*   **Frontend Framework:** Next.js (App Router)
*   **UI Language:** TypeScript
*   **UI Library:** React
*   **Component Library:** Shadcn UI
*   **Styling:** Tailwind CSS
*   **Database & Backend:** Supabase (PostgreSQL, Auth, **Storage**, Realtime - potentially)
*   **AI/LLM Provider:** Mistral AI (via `@mistralai/mistralai` SDK for features like payment slip OCR)
*   **State Management:** Primarily Server Components; potentially `useState`/`useEffect` in client components, `nuqs` for URL state (if used).
*   **Deployment:** Likely Vercel (common pairing with Next.js).

**8. Open Issues / Future Considerations**

*   Detailed CRUD functionality for Bookings, Customers, Fares needs confirmation.
*   Implementation of user roles and permissions beyond basic login.
*   Notification system for deadlines or booking status changes.
*   Advanced reporting features.
*   Search and filtering capabilities within lists (Bookings, Customers).
*   Define specific fields needed for `Tour Products` and `Tour Package Bookings` tables.
*   Clarify if deadlines or specific statuses apply to Tour Package Bookings similarly to standard Bookings.
*   Define how the unique 5-character alphanumeric ID for Tour Package Bookings is generated or enforced upon creation/update.
*   Determine appropriate access policies for the Supabase Storage bucket used for payment slips.
*   Ensure a `number_of_pax` field is present and utilized for `grand_total` calculations in Tour Package Bookings. 