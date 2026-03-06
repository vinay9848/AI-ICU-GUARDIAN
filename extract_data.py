import gzip
import shutil

input_file = "data/mimic-iv-clinical-database-demo-2.2/icu/chartevents.csv.gz"
output_file = "data/mimic-iv-clinical-database-demo-2.2/icu/chartevents.csv"

print("Extracting dataset...")

with gzip.open(input_file, 'rb') as f_in:
    with open(output_file, 'wb') as f_out:
        shutil.copyfileobj(f_in, f_out)

print("Extraction completed!")