from deepface import DeepFace

model = DeepFace.build_model("ArcFace")
print("ArcFace is built")
def verify_face(img1, img2):
    result = DeepFace.verify(
        img1,
        img2,
        model_name="ArcFace",
        detector_backend="retinaface",
    )

    return {
        "match": result["verified"],
        "distance": result["distance"]
    }


print(verify_face("img3.jpg", "img2.png"))