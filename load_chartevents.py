import pandas as pd

# Path to the dataset
file_path = "data/mimic-iv-clinical-database-demo-2.2/icu/chartevents.csv"

print("Loading ICU vital signs dataset...")

df = pd.read_csv(file_path)

print("Dataset Loaded Successfully")

print("Number of rows:", len(df))
print("Number of columns:", len(df.columns))

print("\nFirst 5 rows:")
print(df.head())