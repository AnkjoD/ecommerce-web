-- Migration: add_multi_field_embedding
-- Mục tiêu: Hỗ trợ multi-field embedding (3 vectors/sản phẩm)
-- Thay đổi:
--   1. Thêm cột field_name vào product_embeddings
--   2. Xóa unique constraint cũ (product_id) 
--   3. Thêm unique constraint mới (product_id, field_name)
--   4. Cập nhật HNSW index

-- Bước 1: Thêm cột field_name với giá trị mặc định
ALTER TABLE product_embeddings
ADD COLUMN IF NOT EXISTS field_name VARCHAR(50) NOT NULL DEFAULT 'default';

-- Bước 2: Xóa unique constraint cũ trên product_id
ALTER TABLE product_embeddings
DROP CONSTRAINT IF EXISTS "product_embeddings_product_id_key";

-- Bước 3: Thêm unique constraint mới trên (product_id, field_name)
ALTER TABLE product_embeddings
ADD CONSTRAINT "product_embeddings_product_id_field_name_key" 
UNIQUE (product_id, field_name);

-- Bước 4: Xóa index cũ (nếu có) và tạo lại
DROP INDEX IF EXISTS "product_embeddings_embedding_idx";
CREATE INDEX IF NOT EXISTS "product_embeddings_embedding_idx" 
ON product_embeddings USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;
