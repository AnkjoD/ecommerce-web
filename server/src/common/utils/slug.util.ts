/**
 * slugify: Chuyển đổi tên sang slug (URL-friendly)
 * - Xử lý tiếng Việt (bỏ dấu)
 * - Chuyển sang chữ thường
 * - Thay khoảng trắng bằng dấu gạch ngang
 * - Loại bỏ ký tự đặc biệt
 */
export function slugify(text: string): string {
  if (!text) return '';

  let slug = text.toLowerCase();

  // Chuyển đổi ký tự tiếng Việt có dấu sang không dấu
  slug = slug.replace(/[áàảãạăắằẳẵặâấầẩẫậ]/g, 'a');
  slug = slug.replace(/[éèẻẽẹêếềểễệ]/g, 'e');
  slug = slug.replace(/[íìỉĩị]/g, 'i');
  slug = slug.replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, 'o');
  slug = slug.replace(/[úùủũụưứừửữự]/g, 'u');
  slug = slug.replace(/[ýỳỷỹỵ]/g, 'y');
  slug = slug.replace(/đ/g, 'd');

  // Loại bỏ ký tự đặc biệt, chỉ giữ lại chữ cái, số và khoảng trắng
  slug = slug.replace(/[^a-z0-9\s-]/g, '');

  // Thay thế nhiều khoảng trắng hoặc dấu gạch ngang liên tiếp thành 1 dấu gạch ngang
  slug = slug.replace(/[\s-]+/g, '-');

  // Loại bỏ dấu gạch ngang thừa ở đầu và cuối chuỗi
  slug = slug.replace(/^-+|-+$/g, '');

  return slug;
}
