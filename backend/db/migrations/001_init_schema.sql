-- +migrate Up

CREATE TYPE product_status AS ENUM ('active', 'stopped');
CREATE TYPE order_status AS ENUM ('ordered', 'canceled');
CREATE TYPE review_status AS ENUM ('draft', 'published', 'hidden');

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL UNIQUE,
  password_hash VARCHAR NOT NULL,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,

  CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id)
);

CREATE TABLE refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token_hash VARCHAR NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);

CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE tax_rates (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  rate NUMERIC(5, 4) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  CONSTRAINT chk_tax_rates_rate_non_negative CHECK (rate >= 0)
);

CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  price_excluding_tax INTEGER NOT NULL,
  tax_rate_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  maker_name VARCHAR,
  model_number VARCHAR,
  stock_quantity INTEGER NOT NULL,
  low_stock_threshold INTEGER NOT NULL,
  status product_status NOT NULL,
  image_url VARCHAR,
  released_at DATE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  CONSTRAINT fk_products_tax_rate FOREIGN KEY (tax_rate_id) REFERENCES tax_rates (id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT chk_products_price_excluding_tax_non_negative CHECK (price_excluding_tax >= 0),
  CONSTRAINT chk_products_stock_quantity_non_negative CHECK (stock_quantity >= 0),
  CONSTRAINT chk_products_low_stock_threshold_non_negative CHECK (low_stock_threshold >= 0)
);

CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_tax_rate_id ON products (tax_rate_id);
CREATE INDEX idx_products_status ON products (status);
CREATE INDEX idx_products_released_at ON products (released_at);
CREATE INDEX idx_products_status_category_price ON products (status, category_id, price_excluding_tax);

CREATE TABLE carts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE cart_items (
  id BIGSERIAL PRIMARY KEY,
  cart_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts (id),
  CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT uq_cart_items_cart_product UNIQUE (cart_id, product_id),
  CONSTRAINT chk_cart_items_quantity_positive CHECK (quantity >= 1)
);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  order_number VARCHAR NOT NULL UNIQUE,
  user_id BIGINT NOT NULL,
  order_status order_status NOT NULL,
  total_excluding_tax INTEGER NOT NULL,
  total_tax INTEGER NOT NULL,
  total_including_tax INTEGER NOT NULL,
  ordered_at TIMESTAMP NOT NULL,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT chk_orders_total_excluding_tax_non_negative CHECK (total_excluding_tax >= 0),
  CONSTRAINT chk_orders_total_tax_non_negative CHECK (total_tax >= 0),
  CONSTRAINT chk_orders_total_including_tax_non_negative CHECK (total_including_tax >= 0)
);

CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_order_status ON orders (order_status);
CREATE INDEX idx_orders_ordered_at ON orders (ordered_at);

CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  product_name VARCHAR NOT NULL,
  product_image_url VARCHAR,
  maker_name VARCHAR,
  model_number VARCHAR,
  unit_price_excluding_tax INTEGER NOT NULL,
  tax_rate NUMERIC(5, 4) NOT NULL,
  unit_price_including_tax INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal_excluding_tax INTEGER NOT NULL,
  subtotal_tax INTEGER NOT NULL,
  subtotal_including_tax INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL,

  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id),
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT chk_order_items_unit_price_excluding_tax_non_negative CHECK (unit_price_excluding_tax >= 0),
  CONSTRAINT chk_order_items_tax_rate_non_negative CHECK (tax_rate >= 0),
  CONSTRAINT chk_order_items_unit_price_including_tax_non_negative CHECK (unit_price_including_tax >= 0),
  CONSTRAINT chk_order_items_quantity_positive CHECK (quantity >= 1),
  CONSTRAINT chk_order_items_subtotal_excluding_tax_non_negative CHECK (subtotal_excluding_tax >= 0),
  CONSTRAINT chk_order_items_subtotal_tax_non_negative CHECK (subtotal_tax >= 0),
  CONSTRAINT chk_order_items_subtotal_including_tax_non_negative CHECK (subtotal_including_tax >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);

CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  rating INTEGER NOT NULL,
  title VARCHAR,
  comment TEXT,
  status review_status NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,

  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT uq_reviews_user_product UNIQUE (user_id, product_id),
  CONSTRAINT chk_reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_reviews_comment_requires_title CHECK (comment IS NULL OR title IS NOT NULL)
);

CREATE INDEX idx_reviews_product_id ON reviews (product_id);
CREATE INDEX idx_reviews_product_status_created_at ON reviews (product_id, status, created_at);

-- +migrate Down

DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS tax_rates;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS review_status;
DROP TYPE IF EXISTS order_status;
DROP TYPE IF EXISTS product_status;

