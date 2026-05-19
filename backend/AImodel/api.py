# from time import perf_counter

# from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
# from identity_face import DATABASE, build_face_database, identify_face
# import os
# import json
# import ssl
# import numpy as np
# import cv2
# from fastapi.responses import HTMLResponse
# from deepface import DeepFace
# from starlette.concurrency import run_in_threadpool
# app = FastAPI()

# DETECTOR_BACKEND = os.getenv("DEEPFACE_DETECTOR", "ssd").strip()
# MAX_EXTRACT_SIDE = int(os.getenv("MAX_EXTRACT_SIDE", "1000"))


# def resize_for_extract(image):
#     height, width = image.shape[:2]
#     longest_side = max(width, height)

#     if longest_side <= MAX_EXTRACT_SIDE:
#         return image

#     scale = MAX_EXTRACT_SIDE / longest_side
#     new_size = (int(width * scale), int(height * scale))
#     return cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)


# def get_embedding(image):
#     resized = resize_for_extract(image)

#     result = DeepFace.represent(
#         img_path=resized,
#         model_name="ArcFace",
#         detector_backend=DETECTOR_BACKEND,
#         enforce_detection=True,
#         align=False
#     )
#     return result, DETECTOR_BACKEND

# @app.get("/", response_class=HTMLResponse)
# async def upload_page():
#     return """
#     <html>
#         <body>
#             <h2>Upload Face Image</h2>

#             <input type="file" id="fileInput"/>
#             <button onclick="upload()">Upload</button>

#             <script>
#             async function upload() {
#                 const file = document.getElementById("fileInput").files[0];

#                 const response = await fetch("/verify_face", {
#                     method: "POST",
#                     headers: {
#                         "Content-Type": "image/jpeg"
#                     },
#                     body: file
#                 });

#                 const text = await response.text();
#                 alert(text);
#             }
#             </script>

#         </body>
#     </html>
#     """

# from fastapi import Request, HTTPException
# from time import perf_counter
# import numpy as np
# import cv2

# @app.post("/verify-face")
# async def verify_face(request: Request):

#     content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
#     contents = await request.body()

#     start_time = perf_counter()

#     # Decode ảnh (nhẹ → có thể để ở main thread)
#     nparr = np.frombuffer(contents, np.uint8)
#     img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

#     decoding_time = perf_counter()

#     if img is None:
#         raise HTTPException(status_code=400, detail="Invalid JPEG payload")

#     # 🔥 QUAN TRỌNG: chạy inference trong thread pool
#     result = await run_in_threadpool(identify_face, img)

#     end_time = perf_counter()

#     print(f"decoding  : {(decoding_time - start_time) * 1000:.2f}ms")
#     print(f"identify  : {(end_time - decoding_time) * 1000:.2f}ms")
#     print(f"total     : {(end_time - start_time) * 1000:.2f}ms")

#     if result.get("match"):
#         user_name = result.get("user", "unknown")
#         person_id = result.get("id", user_name)

#         return {
#             "match": True,
#             "user": user_name,
#             "command": "unlock",
#             "name": user_name,
#             "id": person_id,
#             "status": "success"
#         }

#     ## handle error nếu có lỗi trong quá trình nhận diện
#     error_message = result.get("error", "")
#     if error_message:
#         return {
#             "match": False,
#             "error": error_message,
#             "status": "failed"
#         }
#     return {
#         "match": False,
#         "user": None,
#         'person_id': None,
#         "status": "failed"
#     }

# @app.post("/extract")
# async def extract_face(request: Request):
#     # Đọc raw binary y hệt luồng verify-face
#     contents = await request.body()
#     nparr = np.frombuffer(contents, np.uint8)
#     img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

#     if img is None:
#         raise HTTPException(status_code=400, detail="Không thể đọc dữ liệu ảnh thô (Raw Image)")

#     try:
#         start_time = perf_counter()
#         result, detector_backend = await run_in_threadpool(get_embedding, img)
#         end_time = perf_counter()

#         print(
#             f"extract detector={detector_backend} "
#             f"size={img.shape[1]}x{img.shape[0]} "
#             f"time={(end_time - start_time) * 1000:.2f}ms"
#         )

#         return {
#             "vector": result[0]["embedding"],
#             "model": "ArcFace",
#             "detector": detector_backend,
#             "align": True
#         }
#     except ValueError:
#         raise HTTPException(status_code=400, detail="Không tìm thấy khuôn mặt trong ảnh, vui lòng chụp lại rõ hơn")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
    



# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("api:app", host="0.0.0.0", port=5000, reload=True)





from time import perf_counter
from fastapi import FastAPI, Request, HTTPException
import numpy as np
import cv2
from deepface import DeepFace
from starlette.concurrency import run_in_threadpool
from contextlib import asynccontextmanager

MIN_FACE_AREA_RATIO = 0.01

# 1. Định nghĩa trạng thái toàn cục để lưu trữ Model đã nạp sẵn
models_cache = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 🔥 KHỞI TẠO VÀ NẠP SẴN MODEL LÊN RAM KHI SERVER VỪA START
    print("⏳ Đang nạp model ArcFace và OpenCV detector lên RAM...")
    try:
        # Gọi đại một hàm represent với ảnh giả lập để DeepFace tự build và cache model
        dummy_img = np.zeros((112, 112, 3), dtype=np.uint8)
        DeepFace.represent(
            img_path=dummy_img,
            model_name="ArcFace",
            detector_backend="opencv",
            enforce_detection=False, # Tắt nhận diện để tránh lỗi ảnh trống
            align=False
        )
        print("✅ Nạp Model thành công! Server đã sẵn sàng xử lý siêu tốc.")
    except Exception as e:
        print(f"❌ Lỗi nạp model: {str(e)}")
    yield
    # Dọn dẹp bộ nhớ khi tắt server (nếu cần)
    models_cache.clear()

# Khởi tạo app kèm theo cấu hình lifespan
app = FastAPI(lifespan=lifespan)

@app.post("/extract")
async def extract_face(request: Request):
    contents = await request.body()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Không thể đọc dữ liệu ảnh thô (Raw Image)")

    start_time = perf_counter()

    try:
        # Hàm rút trích vector đồng bộ chạy trong threadpool
        def get_embedding(image):
            return DeepFace.represent(
                img_path=image,
                model_name="ArcFace",
                detector_backend="opencv",
                enforce_detection=True,
                align=True  # Giữ nguyên align=True để đảm bảo độ chính xác
            )
        
        # Lúc này DeepFace sẽ nhận diện rất nhanh vì Model đã được cached sẵn trên RAM từ bước lifespan
        result = await run_in_threadpool(get_embedding, img)
        facial_area = result[0].get("facial_area") or {}
        face_width = facial_area.get("w") or 0
        face_height = facial_area.get("h") or 0
        image_height, image_width = img.shape[:2]
        face_area_ratio = (face_width * face_height) / max(image_width * image_height, 1)

        if face_area_ratio < MIN_FACE_AREA_RATIO:
            raise ValueError(f"Detected face is too small or unreliable: area_ratio={face_area_ratio:.4f}")

        end_time = perf_counter()
        print(f"⚡ Thời gian trích xuất vector thực tế: {(end_time - start_time) * 1000:.2f}ms")
        
        return {
            "vector": result[0]["embedding"],
            "model": "ArcFace",
            "detector": "opencv",
            "align": True,
            "face_area_ratio": round(face_area_ratio, 4)
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Không tìm thấy khuôn mặt trong ảnh, vui lòng chụp lại rõ hơn")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=5000, reload=True)
