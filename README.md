
# Susan Shop – Assignment WEB2064 (JS Nâng Cao)

> **Đáp ứng đúng Y1–Y4 theo đề, không thêm – không bớt**

## Y1 – Thiết kế CSDL
Bảng sử dụng (tương ứng keys trong localStorage):
- `categories(id, name, parent_id)`
- `products(id, name, cate_id, detail, image)`
- `product_variants(id, product_id, variant_name, price, quantity, image)`
- `users(id, name, email, phone, address, password)`
- `orders(id, user_id, created_date, status)`
- `order_details(id, order_id, product_id, quantity, unit_price)`

> Trong code: thư mục `js/api/*` thao tác CRUD qua các hàm async để mô phỏng làm việc API (Fetch/Async).

## Y2 – Chức năng
### Member
- Xem danh sách sản phẩm, xem theo danh mục (lọc `cate_id`).
- Lọc theo khoảng giá (min/max).
- Đăng ký, đăng nhập (localStorage).
- Thêm sản phẩm vào giỏ, cập nhật số lượng, xoá.
- Thanh toán giỏ hàng → tạo `orders`, `order_details` → trừ kho `product_variants.quantity`.
- Màn hình cảm ơn sau thanh toán: `thankyou.html`.

### Trang quản trị
- Quản lý danh mục: thêm danh mục.
- Quản lý sản phẩm: thêm sản phẩm, hiển thị khoảng giá theo biến thể.
- Quản lý khách hàng: thêm khách.
- Quản lý đơn hàng: danh sách đơn + tổng tiền.
- Thống kê: số lượng sản phẩm đặt, doanh thu, hàng tồn.

## Y3 – Tổ chức mã & hình ảnh
- Ảnh nằm trong **/images** (dùng `placeholder.svg` nhẹ, tránh vỡ hình).
- CSS nằm trong **/styles**.
- JS tách module: **/js/api**, **/js/**.
- Giao diện tối giản, dễ nhìn.

## Y4 – Tài liệu
- Tài liệu này (`README.md`) liệt kê Y2, Y3 và mô tả sử dụng.

## Cách chạy
Mở `index.html` bằng Live Server (VSCode) hoặc file:// đều được (localStorage hoạt động).
Tài khoản admin mẫu: `admin@susan.shop` / `admin`.

## Ghi chú
- Toàn bộ là **Vanilla JS** (ES6+, module file tách nhỏ).
- Không dùng framework; chỉ CSS thuần nhằm đúng phạm vi đề bài.
