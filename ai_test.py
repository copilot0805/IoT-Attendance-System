from flask import Flask, request, jsonify
from deepface import DeepFace
import os
import uuid

app = Flask(__name__)

@app.route('/extract', methods=['POST'])
def extract_vector():
    # Kiểm tra xem request có file không
    if 'file' not in request.files:
        return jsonify({"error": "Không tìm thấy file ảnh được gửi lên"}), 400
    
    file = request.files['file']
    
    # Lưu file ảnh tạm thời xuống máy để DeepFace đọc
    temp_filename = f"temp_{uuid.uuid4().hex}.jpg"
    file.save(temp_filename)

    try:
        # Gọi thư viện DeepFace, dùng model ArcFace (512 chiều)
        # enforce_detection=True bắt buộc trong ảnh phải có mặt người
        objs = DeepFace.represent(
            img_path=temp_filename, 
            model_name="ArcFace", 
            enforce_detection=True
        )
        
        # objs là một danh sách, ta lấy vector của khuôn mặt đầu tiên
        embedding = objs[0]["embedding"]
        
        # Xử lý xong thì xóa file tạm đi cho nhẹ máy
        os.remove(temp_filename)
        
        # Trả mảng 512 số về cho Node.js
        return jsonify({"vector": embedding, "model": "ArcFace"})
        
    except ValueError as ve:
        # Lỗi này xảy ra khi DeepFace không tìm thấy mặt người trong ảnh
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        return jsonify({"error": "Không nhận diện được khuôn mặt. Vui lòng chụp rõ mặt hơn!"}), 400
        
    except Exception as e:
        # Các lỗi hệ thống khác
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 AI Microservice đang chạy ở port 5001...")
    app.run(port=5001, debug=False)