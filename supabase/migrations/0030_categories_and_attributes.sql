-- 0030_categories_and_attributes.sql
-- Hierarchical categories, dynamic attribute schemas, listing category_id + attributes.

-- =============================================================================
-- Tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.categories (id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  show_condition boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.category_attribute_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'boolean')),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (category_id, field_key)
);

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS categories_parent_id_idx
  ON public.categories (parent_id);

CREATE INDEX IF NOT EXISTS categories_active_sort_idx
  ON public.categories (is_active, sort_order);

CREATE INDEX IF NOT EXISTS categories_parent_active_sort_idx
  ON public.categories (parent_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS listings_category_status_created_idx
  ON public.listings (category_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS listings_attributes_gin_idx
  ON public.listings USING gin (attributes);

CREATE INDEX IF NOT EXISTS category_attribute_schemas_category_idx
  ON public.category_attribute_schemas (category_id, is_active, sort_order);

-- =============================================================================
-- RLS (same pattern as locations: public select active OR admin; admin write)
-- =============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_attribute_schemas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_select ON public.categories;
CREATE POLICY categories_select
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.is_phone_admin());

DROP POLICY IF EXISTS categories_admin_insert ON public.categories;
CREATE POLICY categories_admin_insert
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_phone_admin());

DROP POLICY IF EXISTS categories_admin_update ON public.categories;
CREATE POLICY categories_admin_update
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

DROP POLICY IF EXISTS categories_admin_delete ON public.categories;
CREATE POLICY categories_admin_delete
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (public.is_phone_admin());

DROP POLICY IF EXISTS category_attribute_schemas_select ON public.category_attribute_schemas;
CREATE POLICY category_attribute_schemas_select
  ON public.category_attribute_schemas
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true OR public.is_phone_admin());

DROP POLICY IF EXISTS category_attribute_schemas_admin_insert ON public.category_attribute_schemas;
CREATE POLICY category_attribute_schemas_admin_insert
  ON public.category_attribute_schemas
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_phone_admin());

DROP POLICY IF EXISTS category_attribute_schemas_admin_update ON public.category_attribute_schemas;
CREATE POLICY category_attribute_schemas_admin_update
  ON public.category_attribute_schemas
  FOR UPDATE
  TO authenticated
  USING (public.is_phone_admin())
  WITH CHECK (public.is_phone_admin());

DROP POLICY IF EXISTS category_attribute_schemas_admin_delete ON public.category_attribute_schemas;
CREATE POLICY category_attribute_schemas_admin_delete
  ON public.category_attribute_schemas
  FOR DELETE
  TO authenticated
  USING (public.is_phone_admin());

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.category_attribute_schemas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.category_attribute_schemas TO authenticated;
GRANT ALL ON TABLE public.categories TO service_role;
GRANT ALL ON TABLE public.category_attribute_schemas TO service_role;

-- =============================================================================
-- Seed top-level + child categories (Categories v2)
-- =============================================================================

DO $$
DECLARE
  v_parent uuid;
BEGIN
  -- Vehicles
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Vehicles', 'vehicles', 'car', true, 10, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Cars', 'cars', 'car', 10, true),
    (v_parent, 'Motorcycles', 'motorcycles', 'bike', 20, true),
    (v_parent, 'Trucks & Buses', 'trucks-buses', 'truck', 30, true),
    (v_parent, 'Vehicle Parts', 'vehicle-parts', 'cog', 40, true),
    (v_parent, 'Vehicle Accessories', 'vehicle-accessories', 'wrench', 50, true),
    (v_parent, 'Heavy Equipment', 'heavy-equipment', 'hard-hat', 60, true),
    (v_parent, 'Boats', 'boats', 'ship', 70, true);

  -- Property
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Property', 'property', 'home', true, 20, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Houses for Sale', 'houses-for-sale', 'home', 10, true),
    (v_parent, 'Houses for Rent', 'houses-for-rent', 'key', 20, true),
    (v_parent, 'Land', 'land', 'map', 30, true),
    (v_parent, 'Commercial Property', 'commercial-property', 'building-2', 40, true),
    (v_parent, 'Short Lets', 'short-lets', 'hotel', 50, true),
    (v_parent, 'Event Venues', 'event-venues', 'party-popper', 60, true);

  -- Phones & Tablets
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Phones & Tablets', 'phones-tablets', 'smartphone', true, 30, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Smartphones', 'smartphones', 'smartphone', 10, true),
    (v_parent, 'Tablets', 'tablets', 'tablet', 20, true),
    (v_parent, 'Smartwatches', 'smartwatches', 'watch', 30, true),
    (v_parent, 'Phone Accessories', 'phone-accessories', 'headphones', 40, true);

  -- Computers
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Computers', 'computers', 'laptop', false, 40, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Laptops', 'laptops', 'laptop', 10, true),
    (v_parent, 'Desktop Computers', 'desktop-computers', 'monitor', 20, true),
    (v_parent, 'Computer Accessories', 'computer-accessories', 'mouse', 30, true),
    (v_parent, 'Networking', 'networking', 'wifi', 40, true),
    (v_parent, 'Printers', 'printers', 'printer', 50, true),
    (v_parent, 'Monitors', 'monitors', 'monitor', 60, true),
    (v_parent, 'Storage Devices', 'storage-devices', 'hard-drive', 70, true);

  -- Electronics (top-level shell; computers/TV split out)
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Electronics', 'electronics', 'cpu', false, 50, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Cameras', 'cameras', 'camera', 10, true),
    (v_parent, 'Camera Accessories', 'camera-accessories', 'aperture', 20, true),
    (v_parent, 'Other Electronics', 'other-electronics', 'zap', 30, true);

  -- TV & Audio
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('TV & Audio', 'tv-audio', 'tv', false, 60, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'TVs', 'tvs', 'tv', 10, true),
    (v_parent, 'Home Theaters', 'home-theaters', 'speaker', 20, true),
    (v_parent, 'Speakers', 'speakers', 'speaker', 30, true),
    (v_parent, 'Projectors', 'projectors', 'projector', 40, true),
    (v_parent, 'Streaming Devices', 'streaming-devices', 'cast', 50, true);

  -- Gaming
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Gaming', 'gaming', 'gamepad-2', false, 70, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Consoles', 'consoles', 'gamepad-2', 10, true),
    (v_parent, 'Games', 'games', 'disc', 20, true),
    (v_parent, 'Controllers', 'controllers', 'joystick', 30, true),
    (v_parent, 'Gaming Accessories', 'gaming-accessories', 'headphones', 40, true);

  -- Home & Furniture (+ legacy leaf helpers)
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Home & Furniture', 'home-furniture', 'sofa', true, 80, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Sofas', 'sofas', 'sofa', 10, true),
    (v_parent, 'Beds', 'beds', 'bed', 20, true),
    (v_parent, 'Mattresses', 'mattresses', 'bed-double', 30, true),
    (v_parent, 'Dining Sets', 'dining-sets', 'utensils', 40, true),
    (v_parent, 'Tables', 'tables', 'table', 50, true),
    (v_parent, 'Chairs', 'chairs', 'armchair', 60, true),
    (v_parent, 'Wardrobes', 'wardrobes', 'door-closed', 70, true),
    (v_parent, 'Cabinets', 'cabinets', 'box', 80, true),
    (v_parent, 'Office Furniture', 'office-furniture', 'briefcase', 90, true),
    (v_parent, 'Outdoor Furniture', 'outdoor-furniture', 'trees', 100, true),
    (v_parent, 'Decor', 'decor', 'lamp', 110, true),
    (v_parent, 'Household', 'household', 'house', 120, true),
    (v_parent, 'Furniture', 'furniture', 'sofa', 130, true);

  -- Kitchen & Appliances
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Kitchen & Appliances', 'kitchen-appliances', 'cooking-pot', true, 90, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Refrigerators', 'refrigerators', 'refrigerator', 10, true),
    (v_parent, 'Freezers', 'freezers', 'snowflake', 20, true),
    (v_parent, 'Cookers', 'cookers', 'flame', 30, true),
    (v_parent, 'Ovens', 'ovens', 'microwave', 40, true),
    (v_parent, 'Microwaves', 'microwaves', 'microwave', 50, true),
    (v_parent, 'Blenders', 'blenders', 'blend', 60, true),
    (v_parent, 'Washing Machines', 'washing-machines', 'washing-machine', 70, true),
    (v_parent, 'Air Conditioners', 'air-conditioners', 'air-vent', 80, true),
    (v_parent, 'Fans', 'fans', 'fan', 90, true),
    (v_parent, 'Small Appliances', 'small-appliances', 'plug', 100, true);

  -- Fashion
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Fashion', 'fashion', 'shirt', true, 100, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Men''s Clothing', 'mens-clothing', 'shirt', 10, true),
    (v_parent, 'Women''s Clothing', 'womens-clothing', 'shirt', 20, true),
    (v_parent, 'Children''s Clothing', 'childrens-clothing', 'shirt', 30, true),
    (v_parent, 'Shoes', 'shoes', 'footprints', 40, true),
    (v_parent, 'Bags', 'bags', 'shopping-bag', 50, true),
    (v_parent, 'Jewelry', 'jewelry', 'gem', 60, true),
    (v_parent, 'Watches', 'watches', 'watch', 70, true),
    (v_parent, 'Sunglasses', 'sunglasses', 'glasses', 80, true);

  -- Beauty & Health
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Beauty & Health', 'beauty-health', 'sparkles', false, 110, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Makeup', 'makeup', 'sparkles', 10, true),
    (v_parent, 'Skincare', 'skincare', 'droplet', 20, true),
    (v_parent, 'Hair Products', 'hair-products', 'scissors', 30, true),
    (v_parent, 'Perfumes', 'perfumes', 'flower-2', 40, true),
    (v_parent, 'Salon Equipment', 'salon-equipment', 'scissors', 50, true),
    (v_parent, 'Health Devices', 'health-devices', 'heart-pulse', 60, true);

  -- Babies & Kids
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Babies & Kids', 'babies-kids', 'baby', false, 120, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Baby Gear', 'baby-gear', 'baby', 10, true),
    (v_parent, 'Toys', 'toys', 'toy-brick', 20, true),
    (v_parent, 'Strollers', 'strollers', 'baby', 30, true),
    (v_parent, 'Car Seats', 'car-seats', 'car', 40, true),
    (v_parent, 'Kids Clothing', 'kids-clothing', 'shirt', 50, true);

  -- Pets
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Pets', 'pets', 'paw-print', false, 130, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Dogs', 'dogs', 'dog', 10, true),
    (v_parent, 'Cats', 'cats', 'cat', 20, true),
    (v_parent, 'Birds', 'birds', 'bird', 30, true),
    (v_parent, 'Fish', 'fish', 'fish', 40, true),
    (v_parent, 'Pet Food', 'pet-food', 'bone', 50, true),
    (v_parent, 'Pet Accessories', 'pet-accessories', 'paw-print', 60, true);

  -- Agriculture
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Agriculture', 'agriculture', 'wheat', false, 140, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Farm Equipment', 'farm-equipment', 'tractor', 10, true),
    (v_parent, 'Livestock', 'livestock', 'beef', 20, true),
    (v_parent, 'Seeds', 'seeds', 'sprout', 30, true),
    (v_parent, 'Fertilizers', 'fertilizers', 'leaf', 40, true),
    (v_parent, 'Farm Produce', 'farm-produce', 'carrot', 50, true);

  -- Tools & Equipment
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Tools & Equipment', 'tools-equipment', 'wrench', false, 150, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Power Tools', 'power-tools', 'drill', 10, true),
    (v_parent, 'Hand Tools', 'hand-tools', 'hammer', 20, true),
    (v_parent, 'Construction Equipment', 'construction-equipment', 'hard-hat', 30, true),
    (v_parent, 'Safety Equipment', 'safety-equipment', 'shield', 40, true);

  -- Industrial Equipment
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Industrial Equipment', 'industrial-equipment', 'factory', false, 160, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Manufacturing Equipment', 'manufacturing-equipment', 'factory', 10, true),
    (v_parent, 'Generators', 'generators', 'zap', 20, true),
    (v_parent, 'Compressors', 'compressors', 'gauge', 30, true),
    (v_parent, 'Welding Equipment', 'welding-equipment', 'flame', 40, true);

  -- Sports & Outdoors
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Sports & Outdoors', 'sports-outdoors', 'dumbbell', false, 170, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Gym Equipment', 'gym-equipment', 'dumbbell', 10, true),
    (v_parent, 'Bicycles', 'bicycles', 'bike', 20, true),
    (v_parent, 'Camping', 'camping', 'tent', 30, true),
    (v_parent, 'Football', 'football', 'goal', 40, true),
    (v_parent, 'Fitness', 'fitness', 'activity', 50, true);

  -- Musical Instruments
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Musical Instruments', 'musical-instruments', 'music', false, 180, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Guitars', 'guitars', 'music', 10, true),
    (v_parent, 'Keyboards', 'keyboards', 'piano', 20, true),
    (v_parent, 'Drums', 'drums', 'drum', 30, true),
    (v_parent, 'DJ Equipment', 'dj-equipment', 'disc-3', 40, true),
    (v_parent, 'Studio Equipment', 'studio-equipment', 'mic', 50, true);

  -- Books & Education
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Books & Education', 'books-education', 'book', false, 190, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Books', 'books', 'book-open', 10, true),
    (v_parent, 'School Supplies', 'school-supplies', 'pencil', 20, true),
    (v_parent, 'Educational Materials', 'educational-materials', 'graduation-cap', 30, true);

  -- Hobbies & Collectibles
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Hobbies & Collectibles', 'hobbies-collectibles', 'palette', false, 200, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Art', 'art', 'palette', 10, true),
    (v_parent, 'Antiques', 'antiques', 'landmark', 20, true),
    (v_parent, 'Coins', 'coins', 'coins', 30, true),
    (v_parent, 'Collectibles', 'collectibles', 'star', 40, true);

  -- Food & Catering
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Food & Catering', 'food-catering', 'utensils', false, 210, true)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Catering Equipment', 'catering-equipment', 'utensils-crossed', 10, true),
    (v_parent, 'Restaurant Equipment', 'restaurant-equipment', 'chef-hat', 20, true),
    (v_parent, 'Food Supplies', 'food-supplies', 'shopping-basket', 30, true);

  -- Jobs (no condition)
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Jobs', 'jobs', 'briefcase', true, 220, false)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Full-Time', 'full-time', 'briefcase', 10, false),
    (v_parent, 'Part-Time', 'part-time', 'clock', 20, false),
    (v_parent, 'Remote', 'remote', 'laptop', 30, false),
    (v_parent, 'Internship', 'internship', 'graduation-cap', 40, false);

  -- Services (no condition)
  INSERT INTO public.categories (name, slug, icon, is_featured, sort_order, show_condition)
  VALUES ('Services', 'services', 'handshake', true, 230, false)
  RETURNING id INTO v_parent;

  INSERT INTO public.categories (parent_id, name, slug, icon, sort_order, show_condition) VALUES
    (v_parent, 'Cleaning', 'cleaning', 'sparkles', 10, false),
    (v_parent, 'Plumbing', 'plumbing', 'wrench', 20, false),
    (v_parent, 'Electrical', 'electrical', 'zap', 30, false),
    (v_parent, 'Carpentry', 'carpentry', 'hammer', 40, false),
    (v_parent, 'Painting', 'painting', 'paintbrush', 50, false),
    (v_parent, 'Event Services', 'event-services', 'party-popper', 60, false),
    (v_parent, 'Photography', 'photography', 'camera', 70, false),
    (v_parent, 'Repairs', 'repairs', 'wrench', 80, false),
    (v_parent, 'Moving Services', 'moving-services', 'truck', 90, false),
    (v_parent, 'Tutors', 'tutors', 'book-open', 100, false),
    (v_parent, 'Freelancers', 'freelancers', 'laptop', 110, false),
    (v_parent, 'Beauty Services', 'beauty-services', 'scissors', 120, false);
END $$;

-- =============================================================================
-- Seed attribute schemas for key leaves
-- =============================================================================

DO $$
DECLARE
  v_cat uuid;
BEGIN
  -- Smartphones
  SELECT id INTO v_cat FROM public.categories WHERE slug = 'smartphones';
  INSERT INTO public.category_attribute_schemas
    (category_id, field_key, label, field_type, options, required, sort_order)
  VALUES
    (v_cat, 'brand', 'Brand', 'select',
      '["Apple","Samsung","Tecno","Infinix","Xiaomi","Oppo","Vivo","Nokia","Huawei","Google","Other"]'::jsonb,
      true, 10),
    (v_cat, 'model', 'Model', 'text', '[]'::jsonb, true, 20),
    (v_cat, 'storage', 'Storage', 'select',
      '["32GB","64GB","128GB","256GB","512GB","1TB"]'::jsonb,
      true, 30),
    (v_cat, 'ram', 'RAM', 'select',
      '["2GB","3GB","4GB","6GB","8GB","12GB","16GB"]'::jsonb,
      true, 40);

  -- Cars
  SELECT id INTO v_cat FROM public.categories WHERE slug = 'cars';
  INSERT INTO public.category_attribute_schemas
    (category_id, field_key, label, field_type, options, required, sort_order)
  VALUES
    (v_cat, 'make', 'Make', 'select',
      '["Toyota","Honda","Mercedes-Benz","BMW","Hyundai","Kia","Nissan","Ford","Volkswagen","Lexus","Peugeot","Mazda","Other"]'::jsonb,
      true, 10),
    (v_cat, 'model', 'Model', 'text', '[]'::jsonb, true, 20),
    (v_cat, 'year', 'Year', 'number', '[]'::jsonb, true, 30),
    (v_cat, 'mileage', 'Mileage (km)', 'number', '[]'::jsonb, false, 40),
    (v_cat, 'fuel_type', 'Fuel Type', 'select',
      '["Petrol","Diesel","Hybrid","Electric","CNG"]'::jsonb,
      true, 50),
    (v_cat, 'transmission', 'Transmission', 'select',
      '["Automatic","Manual"]'::jsonb,
      true, 60);

  -- Houses for Sale
  SELECT id INTO v_cat FROM public.categories WHERE slug = 'houses-for-sale';
  INSERT INTO public.category_attribute_schemas
    (category_id, field_key, label, field_type, options, required, sort_order)
  VALUES
    (v_cat, 'bedrooms', 'Bedrooms', 'number', '[]'::jsonb, true, 10),
    (v_cat, 'bathrooms', 'Bathrooms', 'number', '[]'::jsonb, true, 20),
    (v_cat, 'furnished', 'Furnished', 'boolean', '[]'::jsonb, false, 30),
    (v_cat, 'square_metres', 'Square metres', 'number', '[]'::jsonb, false, 40);

  -- Houses for Rent
  SELECT id INTO v_cat FROM public.categories WHERE slug = 'houses-for-rent';
  INSERT INTO public.category_attribute_schemas
    (category_id, field_key, label, field_type, options, required, sort_order)
  VALUES
    (v_cat, 'bedrooms', 'Bedrooms', 'number', '[]'::jsonb, true, 10),
    (v_cat, 'bathrooms', 'Bathrooms', 'number', '[]'::jsonb, true, 20),
    (v_cat, 'furnished', 'Furnished', 'boolean', '[]'::jsonb, false, 30),
    (v_cat, 'square_metres', 'Square metres', 'number', '[]'::jsonb, false, 40);

  -- Job types: full-time / part-time / remote / internship
  FOR v_cat IN
    SELECT id FROM public.categories
    WHERE slug IN ('full-time', 'part-time', 'remote', 'internship')
  LOOP
    INSERT INTO public.category_attribute_schemas
      (category_id, field_key, label, field_type, options, required, sort_order)
    VALUES
      (v_cat, 'salary', 'Salary', 'text', '[]'::jsonb, false, 10),
      (v_cat, 'employment_type', 'Employment Type', 'select',
        '["Full-time","Part-time","Contract","Temporary","Internship","Remote"]'::jsonb,
        true, 20),
      (v_cat, 'experience', 'Experience', 'text', '[]'::jsonb, false, 30);
  END LOOP;

  -- Services: cleaning + plumbing + electrical
  FOR v_cat IN
    SELECT id FROM public.categories
    WHERE slug IN ('cleaning', 'plumbing', 'electrical')
  LOOP
    INSERT INTO public.category_attribute_schemas
      (category_id, field_key, label, field_type, options, required, sort_order)
    VALUES
      (v_cat, 'service_category', 'Service Category', 'text', '[]'::jsonb, false, 10),
      (v_cat, 'availability', 'Availability', 'text', '[]'::jsonb, false, 20);
  END LOOP;
END $$;

-- =============================================================================
-- Migrate existing listings.category text → category_id (+ denormalized slug)
-- =============================================================================

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('furniture', 'furniture'),
      ('beds', 'beds'),
      ('sofas', 'sofas'),
      ('tables', 'tables'),
      ('storage', 'cabinets'),
      ('kitchen', 'small-appliances'),
      ('kitchen-appliances', 'small-appliances'),
      ('fridges', 'refrigerators'),
      ('tv', 'tvs'),
      ('office', 'office-furniture'),
      ('office-furniture', 'office-furniture'),
      ('decor', 'decor'),
      ('household', 'household'),
      ('household-equipment', 'household'),
      ('chairs', 'chairs')
    ) AS m(old_slug, new_slug)
  LOOP
    UPDATE public.listings l
    SET
      category_id = c.id,
      category = c.slug
    FROM public.categories c
    WHERE c.slug = rec.new_slug
      AND lower(trim(l.category)) = rec.old_slug
      AND l.category_id IS NULL;
  END LOOP;
END $$;

-- =============================================================================
-- Rollback (manual)
-- =============================================================================
-- UPDATE public.listings SET category_id = NULL;
-- -- optionally restore denormalized category text from a backup if needed
-- ALTER TABLE public.listings DROP COLUMN IF EXISTS category_id;
-- ALTER TABLE public.listings DROP COLUMN IF EXISTS attributes;
-- DROP INDEX IF EXISTS public.listings_category_status_created_idx;
-- DROP INDEX IF EXISTS public.listings_attributes_gin_idx;
-- DROP TABLE IF EXISTS public.category_attribute_schemas;
-- DROP TABLE IF EXISTS public.categories;
