import os, json, math

INPUT_DIR = "dataset"
OUTPUT_DIR = "dataset_normalizado"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Función para calcular distancia 3D
def dist(p, q):
    return math.sqrt((p[0]-q[0])**2 + (p[1]-q[1])**2 + (p[2]-q[2])**2)

def normalize_landmarks(landmarks, hand_type):
    pts = [(p["x"], p["y"], p.get("z", 0.0)) for p in landmarks]

    # 1. Centrar en muñeca
    wrist = pts[0]
    pts = [(p[0]-wrist[0], p[1]-wrist[1], p[2]-wrist[2]) for p in pts]

    # 2. Escalar
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    scale = max(max(xs) - min(xs), max(ys) - min(ys), 1e-6)
    pts = [(p[0]/scale, p[1]/scale, p[2]/scale) for p in pts]

    # 3. El Truco del Espejo
    if hand_type == "Left":
        pts = [(-p[0], p[1], p[2]) for p in pts]

    # 4. INGENIERÍA DE CARACTERÍSTICAS (9 Distancias Clave)
    # Muñeca(0) a Puntas(4,8,12,16,20) y Pulgar(4) a Puntas(8,12,16,20)
    extra_features = [
        dist(pts[0], pts[4]), dist(pts[0], pts[8]), dist(pts[0], pts[12]), dist(pts[0], pts[16]), dist(pts[0], pts[20]),
        dist(pts[4], pts[8]), dist(pts[4], pts[12]), dist(pts[4], pts[16]), dist(pts[4], pts[20])
    ]

    # Aplanar los 21 puntos
    flat_pts = []
    for p in pts:
        flat_pts.extend([p[0], p[1], p[2]])

    # Devolvemos un solo vector de 72 elementos (63 coords + 9 distancias)
    return flat_pts + extra_features

# --- Procesar ---
for f in os.listdir(INPUT_DIR):
    if not f.endswith(".json"):
        continue

    path = os.path.join(INPUT_DIR, f)
    try:
        data = json.load(open(path, "r", encoding="utf-8"))
        lms = data["landmarks"]
        hand_type = data.get("hand_type", "Right")

        vector_final = normalize_landmarks(lms, hand_type)
        
        data["landmarks_normalized"] = vector_final
        data["input_dim"] = len(vector_final) # Será 72
        
        out_path = os.path.join(OUTPUT_DIR, f)
        with open(out_path, "w", encoding="utf-8") as out:
            json.dump(data, out, indent=4)
        print("✅ Normalizado Pro:", f)

    except Exception as e:
        print("⚠️ Error en", f, "->", e)