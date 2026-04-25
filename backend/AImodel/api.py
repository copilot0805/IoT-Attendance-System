from time import perf_counter

from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from identity_face import DATABASE, build_face_database, identify_face
import os
import json
import ssl
import numpy as np
import cv2
from fastapi.responses import HTMLResponse
from deepface import DeepFace
from starlette.concurrency import run_in_threadpool
app = FastAPI()

@app.get("/", response_class=HTMLResponse)
async def upload_page():
    return """
    <html>
        <body>
            <h2>Upload Face Image</h2>

            <input type="file" id="fileInput"/>
            <button onclick="upload()">Upload</button>

            <script>
            async function upload() {
                const file = document.getElementById("fileInput").files[0];

                const response = await fetch("/verify_face", {
                    method: "POST",
                    headers: {
                        "Content-Type": "image/jpeg"
                    },
                    body: file
                });

                const text = await response.text();
                alert(text);
            }
            </script>

        </body>
    </html>
    """

from fastapi import Request, HTTPException
from time import perf_counter
import numpy as np
import cv2

@app.post("/verify-face")
async def verify_face(request: Request):

    content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
    contents = await request.body()

    start_time = perf_counter()

    # Decode ảnh (nhẹ → có thể để ở main thread)
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    decoding_time = perf_counter()

    if img is None:
        raise HTTPException(status_code=400, detail="Invalid JPEG payload")

    # 🔥 QUAN TRỌNG: chạy inference trong thread pool
    result = await run_in_threadpool(identify_face, img)

    end_time = perf_counter()

    print(f"decoding  : {(decoding_time - start_time) * 1000:.2f}ms")
    print(f"identify  : {(end_time - decoding_time) * 1000:.2f}ms")
    print(f"total     : {(end_time - start_time) * 1000:.2f}ms")

    if result.get("match"):
        user_name = result.get("user", "unknown")
        person_id = result.get("id", user_name)

        return {
            "match": True,
            "user": user_name,
            "command": "unlock",
            "name": user_name,
            "id": person_id,
            "status": "success"
        }

    ## handle error nếu có lỗi trong quá trình nhận diện
    error_message = result.get("error", "")
    if error_message:
        return {
            "match": False,
            "error": error_message,
            "status": "failed"
        }
    return {
        "match": False,
        "user": None,
        'person_id': None,
        "status": "failed"
    }



@app.post("/extract")
async def extract_face(request: Request):
    # Đọc raw binary y hệt luồng verify-face
    contents = await request.body()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Không thể đọc dữ liệu ảnh thô (Raw Image)")

    try:
        def get_embedding(image):
            return DeepFace.represent(
                img_path=image,
                model_name="ArcFace",
                detector_backend="opencv",
                enforce_detection=True,
                align=False
            )
        
        result = await run_in_threadpool(get_embedding, img)
        return {"vector": result[0]["embedding"], "model": "ArcFace"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Không tìm thấy khuôn mặt trong ảnh, vui lòng chụp lại rõ hơn")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=5000, reload=True)
