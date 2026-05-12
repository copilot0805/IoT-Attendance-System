# BAO CAO BACKEND VA FRONTEND

## 1. Thong tin chung

- Ten du an: IoT Attendance System
- Pham vi bao cao: Backend va Frontend cua he thong
- Muc tieu: Danh gia hien trang ky thuat, muc do hoan thien, rui ro va huong cai tien

## 2. Tong quan kien truc he thong

He thong duoc thiet ke theo huong tich hop da thanh phan:

- Thiet bi IoT (ESP32-CAM) gui anh khuon mat
- Backend Node.js xu ly nghiep vu, xac thuc, dieu phoi du lieu
- AI service Python trich xuat vector khuon mat
- PostgreSQL + pgvector dung de luu va so khop vector khuon mat
- Frontend React + TypeScript phuc vu thao tac quan tri va kiem thu API

Luon xu ly chinh:

1. Camera gui anh JPEG raw binary den backend
2. Backend goi AI service de lay embedding vector
3. Backend so khop vector voi du lieu trong PostgreSQL (pgvector)
4. Neu xac thuc thanh cong thi ghi nhat ky cham cong va cap nhat bang cong

## 3. Bao cao Backend

### 3.1. Cong nghe va thu vien

- Node.js + Express
- PostgreSQL (co su dung extension pgvector)
- JWT cho xac thuc va phan quyen
- Multer de nhan upload anh
- Axios de giao tiep voi AI service
- node-cron de chot cong tu dong
- Cloudinary de luu anh cham cong

### 3.2. Cau truc module

Backend duoc to chuc theo huong tach lop:

- Route layer: tiep nhan request va gan middleware
- Controller layer: xu ly request/response
- Service layer: dong goi nghiep vu va thao tac DB
- Database layer: ket noi PostgreSQL

Nhom chuc nang chinh:

- Auth/Login
- Quan ly nguoi dung va khuon mat
- Quan ly ca lam viec
- Phan ca (roster)
- Cham cong + nhat ky + tong hop bang cong
- Cronjob chot cong

### 3.3. API nghiep vu dang co

- Dang nhap: login
- Xac minh khuon mat: verify-face
- User management: list, enroll, update photo, delete
- Shift management: create, update, delete, list
- Roster management: assign, remove, assign bulk, get roster
- Timesheet va attendance logs

### 3.4. Diem manh Backend

- Nghiep vu cham cong duoc mo ta va trien khai kha day du
- Da co xu ly bo dem thoi gian, di tre, thieu check-out, vang mat
- Da su dung pgvector de mo rong bai toan nhan dien khuon mat
- Co cronjob de tu dong chot du lieu ngay hom truoc
- Co phan quyen role ADMIN/EMPLOYEE cho cac route quan tri

### 3.5. Van de va rui ro Backend

1. Validate ID xoa user chua phu hop voi UUID

- Co logic kiem tra ID theo parseInt, trong khi user_id la UUID
- Anh huong: API delete user co the bi tu choi sai

2. Cronjob co dau hieu sai ten cot

- Truy van dung ten cot last_out trong khi schema dung last_check_out
- Anh huong: tien trinh chot cong co nguy co loi runtime

3. Log nhay cam trong luong login

- Co log email/password trong service login
- Anh huong: rui ro bao mat khi deploy that

4. Do phu test chua ro rang

- Chua thay test unit/integration tu dong cho backend
- Anh huong: de phat sinh loi hoi quy khi nang cap

## 4. Bao cao Frontend

### 4.1. Cong nghe

- React 18 + TypeScript
- Vite
- React Router
- Axios

### 4.2. Chuc nang hien co

- Dang nhap
- Bao ve route theo trang thai dang nhap/role
- Trang Dashboard (placeholder)
- Trang User management (enroll/update photo/delete)
- Trang Attendance test (gui JPEG raw binary de test API)

### 4.3. Hien trang kien truc Frontend

Frontend hien ton tai 2 huong to chuc song song:

- Huong cu: App.tsx theo kieu monolithic
- Huong moi: tach module theo app/features/layout/pages

He qua:

- De trung lap logic auth/API client
- De lech key token va contract response
- Tang do kho bao tri khi nhieu thanh vien cung phat trien

### 4.4. Diem manh Frontend

- Da co bo khung route va auth co ban
- Da co trang kiem thu truc tiep luong cham cong
- Co tach module cho huong kien truc moi

### 4.5. Van de va rui ro Frontend

1. Lech endpoint voi backend

- Trang test goi attendance trong khi backend expose verify-face
- Anh huong: de gap loi 404 khi test

2. Lech format token khi dang nhap

- Co dau hieu frontend cu doc accessToken/token trong khi backend tra access_token
- Anh huong: dang nhap xong nhung khong giu duoc session

3. Trung lap tang giao tiep API

- Co 2 API client va 2 auth storage
- Anh huong: hanh vi khong dong nhat giua cac man hinh

4. Chua co test UI

- Chua thay test e2e hoac component test
- Anh huong: kho dam bao chat luong khi mo rong giao dien

## 5. Danh gia muc do hoan thien

- Backend: kha tot o nghiep vu cot loi, can fix gap cac diem sai cot, UUID validate va bao mat log
- Frontend: co nen tang su dung duoc, nhung can hop nhat kien truc va dong bo hop dong API

## 6. De xuat cai tien uu tien

### Uu tien cao (nen lam ngay)

1. Dong bo endpoint cham cong giua frontend va backend
2. Sua logic delete user theo UUID dung chuan
3. Sua cronjob theo dung ten cot schema
4. Loai bo log password khoi backend

### Uu tien trung binh

1. Hop nhat frontend ve mot kien truc duy nhat (uu tien huong module moi)
2. Chuan hoa contract login (ten field token/user)
3. Cap nhat tai lieu API theo code dang chay

### Uu tien tiep theo

1. Them test unit cho service backend quan trong
2. Them test giao dien/chuc nang frontend
3. Bo sung monitoring, error tracking va logging theo cap do

## 7. Ket luan

Du an da co nen tang ky thuat kha vung cho bai toan cham cong IoT bang nhan dien khuon mat. Backend dang la thanh phan trien khai tot nhat va da xu ly duoc nhieu tinh huong nghiep vu thuc te. Frontend da co bo khung de van hanh, tuy nhien can hop nhat kien truc va dong bo API de tranh loi tich hop. Neu thuc hien cac muc uu tien cao trong giai doan tiep theo, he thong co the dat muc on dinh tot cho demo va van hanh thu nghiem.
