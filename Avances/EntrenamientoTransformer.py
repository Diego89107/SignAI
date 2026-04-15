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
import math

# ===============================================================
# CONFIGURACIÓN
# ===============================================================
DATA_DIR = "dataset_normalizado"
MODEL_PATH = "signai_transformer.pth"
LABELMAP_PATH = "label_map_transformer.json"

BATCH_SIZE = 32
LR = 1e-4              # Transformers aprenden mejor con LR pequeño
EPOCHS = 70            # Aprenden más lento, necesitan más épocas
SEED = 42

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

# ===============================================================
# CARGAR DATASET
# ===============================================================
def cargar_dataset(data_dir):
    archivos = sorted(glob(os.path.join(data_dir, "*.json")))
    X = []
    y = []

    for path in archivos:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)

        gesto = data.get("gesto")
        lms = data.get("landmarks_normalized")

        # Filtramos si es un JSON viejo o roto
        if lms is None or len(lms) != 72:
            continue

        X.append(lms)
        y.append(gesto)

    return np.array(X, dtype=np.float32), y


print("📥 Cargando dataset normalizado...")
X, y = cargar_dataset(DATA_DIR)
print(f"Total muestras: {len(X)}")
print(f"Dimensión de entrada: {X.shape[1]} (debería ser 72)")

label_encoder = LabelEncoder()
y_ids = label_encoder.fit_transform(y)

num_classes = len(label_encoder.classes_)
print("Clases detectadas:", list(label_encoder.classes_))

X_train, X_val, y_train, y_val = train_test_split(
    X, y_ids, test_size=0.2, random_state=SEED, stratify=y_ids
)

# ===============================================================
# DATASET PYTORCH
# ===============================================================
class SignDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.from_numpy(X).float()
        self.y = torch.from_numpy(np.array(y)).long()

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

train_ds = SignDataset(X_train, y_train)
val_ds = SignDataset(X_val, y_val)

train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
val_loader   = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False)

# ===============================================================
# POSICIONAL & TRANSFORMER
# ===============================================================
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=1):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len).unsqueeze(1)

        div_term = torch.exp(torch.arange(0, d_model, 2) 
                             * (-math.log(10000.0) / d_model))

        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)

        self.register_buffer("pe", pe)

    def forward(self, x):
        return x + self.pe


class SignTransformer(nn.Module):
    def __init__(self, input_dim, num_classes, dim_model=128, num_heads=4, num_layers=3):
        super().__init__()

        self.input_projection = nn.Linear(input_dim, dim_model)
        self.pos_encoding = PositionalEncoding(dim_model)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=dim_model,
            nhead=num_heads,
            dim_feedforward=dim_model * 4,
            dropout=0.1,
            batch_first=True
        )

        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.fc = nn.Linear(dim_model, num_classes)

    def forward(self, x):
        # x: [batch, 63]
        x = self.input_projection(x)       # [batch, 128]
        x = x.unsqueeze(1)                 # [batch, 1, 128]
        x = self.pos_encoding(x)           # add positional info
        x = self.transformer(x)            # [batch, 1, 128]
        x = x[:, 0, :]                     # [batch, 128]
        out = self.fc(x)                   # [batch, num_classes]
        return out


# ===============================================================
# ENTRENAMIENTO
# ===============================================================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Usando dispositivo:", device)

model = SignTransformer(
    input_dim=X.shape[1],
    num_classes=num_classes,
    dim_model=128,
    num_heads=4,
    num_layers=3
).to(device)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=LR)

def evaluar(model, loader):
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for xb, yb in loader:
            xb, yb = xb.to(device), yb.to(device)
            preds = model(xb).argmax(dim=1)
            correct += (preds == yb).sum().item()
            total += yb.size(0)
    return correct / total if total > 0 else 0

print("\n🚀 Empezando entrenamiento...\n")

for epoch in range(1, EPOCHS + 1):
    model.train()
    running_loss = 0.0

    for xb, yb in train_loader:
        xb, yb = xb.to(device), yb.to(device)

        optimizer.zero_grad()
        logits = model(xb)
        loss = criterion(logits, yb)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * xb.size(0)

    train_loss = running_loss / len(train_loader.dataset)
    train_acc = evaluar(model, train_loader)
    val_acc = evaluar(model, val_loader)

    print(
        f"Época {epoch:03d} | Loss: {train_loss:.4f} | "
        f"Train Acc: {train_acc*100:.1f}% | Val Acc: {val_acc*100:.1f}%"
    )

print("\n✅ Entrenamiento terminado.\n")

torch.save(model.state_dict(), MODEL_PATH)
print(f"💾 Modelo guardado en: {MODEL_PATH}")

with open(LABELMAP_PATH, "w", encoding="utf-8") as f:
    json.dump({"classes": label_encoder.classes_.tolist()}, f, indent=4)

print(f"💾 Label map guardado en: {LABELMAP_PATH}")
print("\n🎉 Transformer de SignAI entrenado correctamente.\n")
