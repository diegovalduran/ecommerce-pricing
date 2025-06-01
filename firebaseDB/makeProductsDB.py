import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd

# Load Firebase credentials
cred = credentials.Certificate("firebase-db-gdx2-firebase-adminsdk-fbsvc-4030f3a68f.json")  # Update this path
print("Initializing Firebase...")
firebase_admin.initialize_app(cred)

# Connect to Firestore
print("Loading CSV...")
db = firestore.client()

# Load CSV file
csv_file = "cleaned_GDX.csv"  # Update with actual filename
df = pd.read_csv(csv_file)

# Upload data to Firestore
# for index, row in df.iterrows():
for index, row in df.iterrows():
    print(f"Uploading {row['Product number']}...")
    doc_ref = db.collection("products").document(str(row["Product number"]))
    doc_ref.set({
        "name": row["Product name"],
        "sku": row["SKU Number"],
        "size": row["Size"],
        "color": row["Color"],
        "price": row["Price"],
        "sales": row["Sales"],
        "stock": row["Stock"],
        "inventory_rotation": row["Inventory Rotation"],
        "date": row["Date"],
        "sheet": row["Sheet"]
    })

print("CSV data uploaded to Firestore successfully.")