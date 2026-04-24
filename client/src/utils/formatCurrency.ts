export const formatCurrency = (amount: number, currency: 'VND' | 'USD' | 'EUR' | 'JPY' | 'KRW' = 'VND') => {
  // 1. Kiểm tra an toàn
  if (!amount || isNaN(amount)) return '0'
  const value = Number(amount)

  // 2. Map loại tiền tệ sang mã vùng (Locale) tương ứng
  // Để hiển thị đúng kiểu: USD thì $ đứng trước, VND thì đ đứng sau, dấu chấm phẩy đúng chuẩn.
  const localeMap = {
    VND: 'vi-VN', // Tiếng Việt (100.000 ₫)
    USD: 'en-US', // Tiếng Anh Mỹ ($100.00)
    EUR: 'de-DE', // Tiếng Đức (100,00 €) - châu Âu hay dùng phẩy cho thập phân
    JPY: 'ja-JP', // Tiếng Nhật (￥100)
    KRW: 'ko-KR' // Tiếng Hàn (₩100)
  }

  // Lấy locale từ map, nếu không có trong list trên thì mặc định dùng 'en-US' (chuẩn quốc tế)
  const locale = localeMap[currency] || 'en-US'

  // 3. Format
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
    // maximumFractionDigits: 0, // Bỏ comment dòng này nếu muốn làm tròn, không lấy số lẻ
  }).format(value)
}

export default formatCurrency
