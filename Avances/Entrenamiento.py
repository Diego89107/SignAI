import os
import json
import random
from glob import glob

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torch.optim as optim

# ==========================
# CONFIGURACIÓN
# ==========================
DATA_DIR = "dataset_normalizado"    # carpeta donde están tus JSON normalizados
MODEL_PATH = "signai.pth"
LABELMAP_PATH = "label_map.json"

BATCH_SIZE = 32
LR = 1e-3
EPOCHS = 50
SEED = 42

# Fijar semillas para reproducibilidad
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

# ==========================
# CARGA DEL DATASET
# ==========================

def cargar_dataset(data_dir):
    """
    Lee todos los .json de data_dir y devuelve:
    X: np.array [N, 63]  (21 puntos * 3 coords)
    y: lista de etiquetas string
    """
    archivos = sorted(glob(os.path.join(data_dir, "*.json")))
    X = []
    y = []

    for path in archivos:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        gesto = data.get("gesto")
        lms = data.get("landmarks_normalized")

        # seguridad: si por algo no tiene landmarks_normalized, usa landmarks normal
        if lms is None:
            lms = data["landmarks"]

        # lms es lista de 21 dicts {"x":..,"y":..,"z":..}
        if len(lms) != 21:
            continue  # saltar si está roto

        coords = []
        for p in lms:
            coords.extend([p["x"], p["y"], p.get("z", 0.0)])

        X.append(coords)
        y.append(gesto)

    X = np.array(X, dtype=np.float32)
    return X, y

print("📥 Cargando dataset normalizado...")
X, y = cargar_dataset(DATA_DIR)
print(f"Total muestras: {len(X)}")
print(f"Dimensión de entrada: {X.shape[1]} (debería ser 63)")

# Codificar etiquetas a enteros
label_encoder = LabelEncoder()
y_ids = label_encoder.fit_transform(y)

num_classes = len(label_encoder.classes_)
print("Clases:", list(label_encoder.classes_))
print("Número de clases:", num_classes)

# Train / Valid split
X_train, X_val, y_train, y_val = train_test_split(
    X, y_ids, test_size=0.2, random_state=SEED, stratify=y_ids
)

# ==========================
# DATASET Y DATALOADER
# ==========================

class SignDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.from_numpy(X).float()
        self.y = torch.from_numpy(np.array(y)).long()

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

train_dataset = SignDataset(X_train, y_train)
val_dataset   = SignDataset(X_val, y_val)

train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
val_loader   = DataLoader(val_dataset,   batch_size=BATCH_SIZE, shuffle=False)

# ==========================
# MODELO MLP
# ==========================

class SignMLP(nn.Module):
    def __init__(self, input_dim=63, num_classes=10):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.2),

            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),

            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        return self.net(x)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Usando dispositivo:", device)

model = SignMLP(input_dim=X.shape[1], num_classes=num_classes).to(device)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=LR)

# ==========================
# LOOP DE ENTRENAMIENTO
# ==========================

def evaluar(model, loader):
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for xb, yb in loader:
            xb = xb.to(device)
            yb = yb.to(device)
            logits = model(xb)
            preds = logits.argmax(dim=1)
            correct += (preds == yb).sum().item()
            total += yb.size(0)
    return correct / total if total > 0 else 0.0

print("Empezando entrenamiento...")

for epoch in range(1, EPOCHS+1):
    model.train()
    running_loss = 0.0

    for xb, yb in train_loader:
        xb = xb.to(device)
        yb = yb.to(device)

        optimizer.zero_grad()
        logits = model(xb)
        loss = criterion(logits, yb)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * xb.size(0)

    train_loss = running_loss / len(train_loader.dataset)
    train_acc = evaluar(model, train_loader)
    val_acc = evaluar(model, val_loader)

    print(f"Época {epoch:03d} | Loss: {train_loss:.4f} | "
          f"Train Acc: {train_acc*100:5.1f}% | Val Acc: {val_acc*100:5.1f}%")

print("✅ Entrenamiento terminado.")

# ==========================
# GUARDAR MODELO Y LABEL MAP
# ==========================

torch.save(model.state_dict(), MODEL_PATH)
print(f"💾 Modelo guardado en: {MODEL_PATH}")

label_map = {
    "classes": label_encoder.classes_.tolist()
}
with open(LABELMAP_PATH, "w", encoding="utf-8") as f:
    json.dump(label_map, f, indent=4, ensure_ascii=False)
print(f"💾 Mapa de etiquetas guardado en: {LABELMAP_PATH}")

print("Modelo terminado")
