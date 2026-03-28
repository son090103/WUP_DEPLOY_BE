# 🚌 Bus Route Management API Documentation

## 📋 Mục lục

- [Đăng nhập](#-đăng-nhập)
- [1. View All Account](#1-view-all-account)
- [2. Update Bus](#2-update-bus)
- [3. View Bus Route](#3-view-bus-route)
- [4. Update Bus Route](#4-update-bus-route)
- [5. Update Bus Route Node](#5-update-bus-route-node)
- [6. Delete Bus Route Node](#6-delete-bus-route-node)
- [Tổng hợp API](#-tổng-hợp-api-endpoints)
- [Test Accounts](#-test-accounts)

---

## 🔐 Đăng nhập

**Endpoint:** `POST /api/customer/notcheck/login`

**Request:**

```json
{
  "phone": "0900000001",
  "password": "123456"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> ⚠️ Copy `token` từ response để sử dụng cho các API yêu cầu Authorization

---

## 1. VIEW ALL ACCOUNT

### 1.1. Lấy danh sách accounts

| Method | Endpoint                    | Auth        |
| ------ | --------------------------- | ----------- |
| GET    | `/api/admin/check/accounts` | ✅ Required |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Trang hiện tại |
| limit | number | 10 | Số item/trang |
| status | string | - | active / inactive / banned |
| role | string | - | Role ID |
| search | string | - | Tìm theo tên hoặc SĐT |

**Ví dụ:**

```
GET /api/admin/check/accounts?page=1&limit=10&status=active&search=admin
Authorization: Bearer <token>
```

### 1.2. Lấy chi tiết account

| Method | Endpoint                        | Auth        |
| ------ | ------------------------------- | ----------- |
| GET    | `/api/admin/check/accounts/:id` | ✅ Required |

**Ví dụ:**

```
GET /api/admin/check/accounts/698b5a9e4117ccd606601d7d
Authorization: Bearer <token>
```

---

## 2. UPDATE BUS

### 2.1. Lấy chi tiết bus

| Method | Endpoint                     | Auth        |
| ------ | ---------------------------- | ----------- |
| GET    | `/api/admin/check/buses/:id` | ✅ Required |

### 2.2. Cập nhật thông tin bus

| Method | Endpoint                     | Auth        |
| ------ | ---------------------------- | ----------- |
| PUT    | `/api/admin/check/buses/:id` | ✅ Required |

**Request Body:**

```json
{
  "license_plate": "51B-999.99",
  "status": "MAINTENANCE"
}
```

### 2.3. Cập nhật trạng thái bus

| Method | Endpoint                            | Auth        |
| ------ | ----------------------------------- | ----------- |
| PATCH  | `/api/admin/check/buses/:id/status` | ✅ Required |

**Bật bus:**

```json
{
  "status": "ACTIVE"
}
```

**Tắt bus:**

```json
{
  "status": "MAINTENANCE"
}
```

### 2.4. Cập nhật seat layout

| Method | Endpoint                                 | Auth        |
| ------ | ---------------------------------------- | ----------- |
| PATCH  | `/api/admin/check/buses/:id/seat-layout` | ✅ Required |

**Request Body:**

```json
{
  "seat_layout": {
    "template_name": "Giường nằm 40 chỗ VIP",
    "floors": 2,
    "rows": 10,
    "columns": [
      { "name": "LEFT", "seats_per_row": 1 },
      { "name": "RIGHT", "seats_per_row": 1 }
    ],
    "total_seats": 40
  }
}
```

---

## 3. VIEW BUS ROUTE

### 3.1. Lấy danh sách routes (Public)

| Method | Endpoint                        | Auth            |
| ------ | ------------------------------- | --------------- |
| GET    | `/api/customer/notcheck/routes` | ❌ Not Required |

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Trang hiện tại |
| limit | number | Số item/trang |
| search | string | Tìm theo tên |

**Ví dụ:**

```
GET /api/customer/notcheck/routes?page=1&limit=10&search=Hà Nội
```

### 3.2. Lấy chi tiết route (Public)

| Method | Endpoint                            | Auth            |
| ------ | ----------------------------------- | --------------- |
| GET    | `/api/customer/notcheck/routes/:id` | ❌ Not Required |

### 3.3. Tìm kiếm routes theo điểm đi/đến

| Method | Endpoint                               | Auth            |
| ------ | -------------------------------------- | --------------- |
| GET    | `/api/customer/notcheck/routes/search` | ❌ Not Required |

**Ví dụ:**

```
GET /api/customer/notcheck/routes/search?from=<stopId>&to=<stopId>
```

### 3.4. Lấy danh sách stops

| Method | Endpoint                       | Auth            |
| ------ | ------------------------------ | --------------- |
| GET    | `/api/customer/notcheck/stops` | ❌ Not Required |

### 3.5. Lấy routes (Admin - bao gồm inactive)

| Method | Endpoint                  | Auth        |
| ------ | ------------------------- | ----------- |
| GET    | `/api/admin/check/routes` | ✅ Required |

**Ví dụ:**

```
GET /api/admin/check/routes?page=1&limit=10&is_active=false
Authorization: Bearer <token>
```

### 3.6. Chi tiết route (Admin)

| Method | Endpoint                      | Auth        |
| ------ | ----------------------------- | ----------- |
| GET    | `/api/admin/check/routes/:id` | ✅ Required |

---

## 4. UPDATE BUS ROUTE

### 4.1. Cập nhật route

| Method | Endpoint                      | Auth        |
| ------ | ----------------------------- | ----------- |
| PUT    | `/api/admin/check/routes/:id` | ✅ Required |

**Request Body:**

```json
{
  "distance_km": 800,
  "is_active": true
}
```

### 4.2. Bật/Tắt route

| Method | Endpoint                             | Auth        |
| ------ | ------------------------------------ | ----------- |
| PATCH  | `/api/admin/check/routes/:id/status` | ✅ Required |

**Bật route:**

```json
{
  "is_active": true
}
```

**Tắt route:**

```json
{
  "is_active": false
}
```

---

## 5. UPDATE BUS ROUTE NODE

### 5.1. Thêm stop mới vào route

| Method | Endpoint                                 | Auth        |
| ------ | ---------------------------------------- | ----------- |
| POST   | `/api/admin/check/routes/:routeId/stops` | ✅ Required |

**Thêm vào vị trí cụ thể:**

```json
{
  "stop_id": "<stop_id>",
  "stop_order": 3,
  "is_pickup": true
}
```

**Thêm vào cuối:**

```json
{
  "stop_id": "<stop_id>",
  "is_pickup": true
}
```

### 5.2. Đổi thứ tự stop

| Method | Endpoint                                               | Auth        |
| ------ | ------------------------------------------------------ | ----------- |
| PUT    | `/api/admin/check/routes/:routeId/stops/:stopId/order` | ✅ Required |

**Request Body:**

```json
{
  "new_order": 2
}
```

> Hệ thống tự động reorder các stops khác

### 5.3. Bật/Tắt pickup

| Method | Endpoint                                                | Auth        |
| ------ | ------------------------------------------------------- | ----------- |
| PATCH  | `/api/admin/check/routes/:routeId/stops/:stopId/pickup` | ✅ Required |

**Bật:**

```json
{
  "is_pickup": true
}
```

**Tắt:**

```json
{
  "is_pickup": false
}
```

### 5.4. Thêm location cho stop

| Method | Endpoint                                                   | Auth        |
| ------ | ---------------------------------------------------------- | ----------- |
| POST   | `/api/admin/check/routes/:routeId/stops/:stopId/locations` | ✅ Required |

**Request Body:**

```json
{
  "name": "Bến xe ABC",
  "address": "123 Đường XYZ, Quận 1",
  "latitude": 10.8231,
  "longitude": 106.6297,
  "type": "BOTH"
}
```

**Type values:** `PICKUP` | `DROPOFF` | `BOTH`

### 5.5. Cập nhật location

| Method | Endpoint                         | Auth        |
| ------ | -------------------------------- | ----------- |
| PUT    | `/api/admin/check/locations/:id` | ✅ Required |

**Request Body:**

```json
{
  "name": "Bến xe Mỹ Đình - Updated",
  "address": "20 Phạm Hùng, Hà Nội",
  "latitude": 21.029,
  "longitude": 105.783,
  "type": "PICKUP"
}
```

### 5.6. Bật/Tắt location

| Method | Endpoint                                | Auth        |
| ------ | --------------------------------------- | ----------- |
| PATCH  | `/api/admin/check/locations/:id/status` | ✅ Required |

**Bật:**

```json
{
  "is_active": true
}
```

**Tắt:**

```json
{
  "is_active": false
}
```

---

## 6. DELETE BUS ROUTE NODE

### 6.1. Xóa stop khỏi route

| Method | Endpoint                                         | Auth        |
| ------ | ------------------------------------------------ | ----------- |
| DELETE | `/api/admin/check/routes/:routeId/stops/:stopId` | ✅ Required |

> ⚠️ Route phải có ít nhất 2 stops. Xóa stop sẽ tự động xóa locations và reorder.

### 6.2. Xóa location

| Method | Endpoint                         | Auth        |
| ------ | -------------------------------- | ----------- |
| DELETE | `/api/admin/check/locations/:id` | ✅ Required |

> ⚠️ Mỗi stop phải có ít nhất 1 active location

---

## 📊 Tổng hợp API Endpoints

### Account Management

| Method | Endpoint                        | Description        |
| ------ | ------------------------------- | ------------------ |
| GET    | `/api/admin/check/accounts`     | Danh sách accounts |
| GET    | `/api/admin/check/accounts/:id` | Chi tiết account   |

### Bus Management

| Method | Endpoint                                 | Description          |
| ------ | ---------------------------------------- | -------------------- |
| GET    | `/api/admin/check/buses/:id`             | Chi tiết bus         |
| PUT    | `/api/admin/check/buses/:id`             | Cập nhật bus         |
| PATCH  | `/api/admin/check/buses/:id/status`      | Cập nhật status      |
| PATCH  | `/api/admin/check/buses/:id/seat-layout` | Cập nhật seat layout |

### Bus Route Management

| Method | Endpoint                               | Description               |
| ------ | -------------------------------------- | ------------------------- |
| GET    | `/api/customer/notcheck/routes`        | Danh sách routes (public) |
| GET    | `/api/customer/notcheck/routes/:id`    | Chi tiết route (public)   |
| GET    | `/api/customer/notcheck/routes/search` | Tìm kiếm routes           |
| GET    | `/api/customer/notcheck/stops`         | Danh sách stops           |
| GET    | `/api/admin/check/routes`              | Danh sách routes (admin)  |
| GET    | `/api/admin/check/routes/:id`          | Chi tiết route (admin)    |
| PUT    | `/api/admin/check/routes/:id`          | Cập nhật route            |
| PATCH  | `/api/admin/check/routes/:id/status`   | Bật/tắt route             |

### Route Node Management

| Method | Endpoint                                                   | Description       |
| ------ | ---------------------------------------------------------- | ----------------- |
| POST   | `/api/admin/check/routes/:routeId/stops`                   | Thêm stop         |
| DELETE | `/api/admin/check/routes/:routeId/stops/:stopId`           | Xóa stop          |
| PUT    | `/api/admin/check/routes/:routeId/stops/:stopId/order`     | Đổi thứ tự        |
| PATCH  | `/api/admin/check/routes/:routeId/stops/:stopId/pickup`    | Bật/tắt pickup    |
| POST   | `/api/admin/check/routes/:routeId/stops/:stopId/locations` | Thêm location     |
| PUT    | `/api/admin/check/locations/:id`                           | Cập nhật location |
| PATCH  | `/api/admin/check/locations/:id/status`                    | Bật/tắt location  |
| DELETE | `/api/admin/check/locations/:id`                           | Xóa location      |

---

## 🧪 Test Accounts

| Name           | Phone      | Password | Role             |
| -------------- | ---------- | -------- | ---------------- |
| Admin System   | 0900000001 | 123456   | admin            |
| Admin Manager  | 0900000002 | 123456   | admin            |
| Nguyen Van A   | 0911111111 | 123456   | customer         |
| Tran Thi B     | 0911111112 | 123456   | customer         |
| Tai Xe Minh    | 0922222221 | 123456   | driver           |
| Tai Xe Hung    | 0922222222 | 123456   | driver           |
| Le Nhan Vien A | 0933333331 | 123456   | receptionist     |
| Phu Xe Anh     | 0944444441 | 123456   | assistant_driver |
