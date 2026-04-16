from time import perf_counter
from cv2 import threshold
from deepface import DeepFace
import numpy as np
import os
import tensorflow as tf

gpus = tf.config.list_physical_devices('GPU')  # Kiểm tra GPU có được TensorFlow nhận diện không

if gpus:
    print(f"Đã phát hiện {len(gpus)} GPU:")
else:
    print("Không phát hiện GPU nào. TensorFlow sẽ sử dụng CPU, có thể chậm hơn nhiều.")
    
DATABASE = {
    "user1": "img2.png",
    "user2": "usr2.jpg",
}

def build_face_database(database: dict) -> dict:
    embeddings = {}

    for user_name, img_path in database.items():
        try:
            # Kiểm tra file tồn tại không
            if not os.path.exists(img_path):
                print(f"[ERROR] {user_name}: File không tồn tại → '{img_path}'")
                continue

            result = DeepFace.represent(
                img_path=img_path,
                model_name='ArcFace',
                detector_backend='opencv',
                enforce_detection=True,
                align=False
            )

            # Kiểm tra detect được mặt không
            if not result or len(result) == 0:
                print(f"[ERROR] {user_name}: Không detect được khuôn mặt trong ảnh")
                continue

            embeddings[user_name] = np.array(result[0]["embedding"])
            print(f"[OK] {user_name}: embedding shape = {embeddings[user_name].shape}")

        except ValueError as e:
            print(f"[ERROR] {user_name}: Không tìm thấy mặt → {e}")
        except Exception as e:
            print(f"[ERROR] {user_name}: Lỗi không xác định → {type(e).__name__}: {e}")

    print(f"\nKết quả: {len(embeddings)}/{len(database)} ảnh load thành công")
    return embeddings

NEWDATABASE = build_face_database(DATABASE)

def identify_face(query_img):
   
    start_time = perf_counter()

    try:
        # Chỉ extract embedding của query frame, không verify lại db
        result = DeepFace.represent(
            img_path=query_img,
            model_name="ArcFace",
            detector_backend="opencv",
            enforce_detection=False,
            align=False
        )
        query_emb = np.array(result[0]["embedding"])
    except Exception as e:
        return {"match": False, "error": str(e)}
    
    represent_time = perf_counter()  # ← đo riêng represent time nếu muốn
    best_match    = None
    best_distance = float("inf")

    # ✅ So sánh trực tiếp với embeddings đã tính sẵn, chỉ là phép dot product
    for user_name, db_emb in NEWDATABASE.items():
        cosine_sim = np.dot(query_emb, db_emb) / (np.linalg.norm(query_emb) * np.linalg.norm(db_emb))
        distance = 1 - cosine_sim
        if distance < best_distance:
            best_distance = distance
            best_match    = user_name
    threshold = 0.65 # Cần thử nghiệm để chọn threshold phù hợp
    end_time = perf_counter()  # ← đo toàn bộ thời gian từ represent đến kết quả cuối cùng
     # Log chi tiết từng bước
    print(f"represent : {(represent_time - start_time) * 1000:.2f}ms")
    print(f"cosine    : {(end_time - represent_time) * 1000:.2f}ms")
    print(f"total     : {(end_time - start_time) * 1000:.2f}ms")
    if best_distance <= threshold:
        return {"match": True, "user": best_match, "distance": round(best_distance, 4)}
    print(f"No match found. Best distance: {best_distance:.4f} (threshold: {threshold})")
    return {"match": False, "distance": round(best_distance, 4)}