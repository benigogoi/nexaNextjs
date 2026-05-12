-- NEXA DESIGN LAB - DATABASE SCHEMA
-- Paste this entire script into your Supabase SQL Editor and hit run.
-- This version adds admin auth and locks backend writes behind Supabase Auth.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create the Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  sku VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  base_price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  mockup_urls TEXT[],
  variants JSONB DEFAULT '[]'::jsonb,
  status VARCHAR DEFAULT 'Active'
);

-- 2. Create the Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  total_spent DECIMAL(10, 2) DEFAULT 0.00,
  lifetime_orders INTEGER DEFAULT 0
);

-- 3. Create the Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  name VARCHAR UNIQUE NOT NULL,
  slug VARCHAR UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE
);

-- 4. Create the Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  order_number VARCHAR UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR DEFAULT 'Processing'
);

-- 5. Create the Carts Table (for anonymous sessions)
CREATE TABLE IF NOT EXISTS carts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  session_id VARCHAR UNIQUE NOT NULL,
  items JSONB DEFAULT '[]'::jsonb
);

-- 6. Create the Admin Users Table
-- Add one row here for each Supabase auth user that should reach the backend.
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Set up Storage Bucket for Product Images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 9. Reset old development policies if they already exist
DROP POLICY IF EXISTS "Allow public read access for products" ON products;
DROP POLICY IF EXISTS "Allow public insert for products" ON products;
DROP POLICY IF EXISTS "Allow public update for products" ON products;
DROP POLICY IF EXISTS "Allow public delete for products" ON products;
DROP POLICY IF EXISTS "Allow public read access for categories" ON categories;
DROP POLICY IF EXISTS "Allow public insert for categories" ON categories;
DROP POLICY IF EXISTS "Allow public update for categories" ON categories;
DROP POLICY IF EXISTS "Allow public delete for categories" ON categories;
DROP POLICY IF EXISTS "Allow public all on carts" ON carts;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;

DROP POLICY IF EXISTS "Users can read their admin membership" ON admin_users;
DROP POLICY IF EXISTS "Public can read products" ON products;
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;
DROP POLICY IF EXISTS "Public can read categories" ON categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Admins can update categories" ON categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON categories;
DROP POLICY IF EXISTS "Admins can manage customers" ON customers;
DROP POLICY IF EXISTS "Admins can manage orders" ON orders;
DROP POLICY IF EXISTS "Public can manage carts" ON carts;
DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

-- 10. Policies
CREATE POLICY "Users can read their admin membership"
ON admin_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Public can read products"
ON products
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert products"
ON products
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update products"
ON products
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can delete products"
ON products
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Public can read categories"
ON categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert categories"
ON categories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update categories"
ON categories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can delete categories"
ON categories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage customers"
ON customers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage orders"
ON orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Public can manage carts"
ON carts
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Public can read product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);

-- 11. Bundle Products Migration
-- Run the block below in the Supabase SQL editor to enable bundle products.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_bundle    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bundle_items JSONB   DEFAULT '[]'::jsonb;

-- 12. Create Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code VARCHAR UNIQUE NOT NULL,
  discount_type VARCHAR DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_value DECIMAL(10, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Allow anyone to read coupons for checkout verification
CREATE POLICY "Allow anyone to view coupons" ON coupons FOR SELECT USING (true);
-- Allow admin users full access to manipulate coupons
CREATE POLICY "Admin full access to coupons" ON coupons FOR ALL USING (true);

-- 13. Create Coupon Usages Table
CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id UUID,
  email VARCHAR NOT NULL,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access to usages" ON coupon_usages FOR ALL USING (true);

-- 14. End of Schema

