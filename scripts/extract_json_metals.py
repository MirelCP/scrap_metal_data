import os
import json
from bs4 import BeautifulSoup
import glob
from datetime import datetime
import re

# Point to the correct folder
data_dir = os.path.join(os.path.dirname(__file__), "data")
html_files = glob.glob(os.path.join(data_dir, "*.html"))
if not html_files:
    raise FileNotFoundError("❌ No HTML files found in the folder.")

html_files.sort(key=os.path.getmtime, reverse=True)
html_path = html_files[0]
print(f"Using HTML: {html_path}")
output_dir = "data_json"
output_json = os.path.join(output_dir, "scrap_prices.json")

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def clean_material_name(text):
    # Dictionary of material name mappings
    material_mappings = {
        'Copper No.1': 'Copper #1',
        'Copper No.2': 'Copper #2',
        'Sheet Copper': 'Copper Sheet',
        'AL Sheet': 'Aluminum Sheet',
        'Cast Alum': 'Cast Aluminum',
        'AL Extrusion': 'Aluminum Extrusion',
        'Aluminum Copper Unit': 'Aluminum-Copper Mix',
        'Aluminum Wire': 'Aluminum Wire',
        'Brass': 'Brass',
        'Stainless Steel': 'Stainless Steel',
        'Shredded Scrap (US )': 'Shredded Steel'
    }
    
    # Try to match the beginning of the text with each key
    for key, value in material_mappings.items():
        if text.startswith(key):
            return value
    
    # If no match found, clean up the text
    return text.split('grade applies')[0].split('refers')[0].split('is')[0].strip()

def extract_price(text):
    # Find price using regex (US$ followed by numbers and optional decimal)
    price_match = re.search(r'US\$\s*(\d+(?:\.\d+)?)', text)
    if price_match:
        return float(price_match.group(1))
    return None

def extract_date(text):
    # Find date in format DD/MM/YYYY
    date_match = re.search(r'(\d{2}/\d{2}/\d{4})', text)
    if date_match:
        # Convert to YYYY-MM-DD format
        day, month, year = date_match.group(1).split('/')
        return f"{year}-{month}-{day}"
    return None

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")
price_boxes = soup.select('.p-2.mobileview')

result = []
for box in price_boxes:
    try:
        # Extract material name and price
        flex_col = box.select_one('.flex.flex-col')
        items_start = box.select_one('.items-start')
        
        if flex_col and items_start:
            text = flex_col.get_text(strip=True)
            material = clean_material_name(text)
            price = extract_price(text)
            update_date = extract_date(text)
            
            if material and price:
                item = {
                    "date": update_date or datetime.now().strftime("%Y-%m-%d"),
                    "material": material,
                    "price": price,
                    "currency": "USD",
                    "unit": "lb" if price < 100 else "ton",
                    "location": "US"
                }
                result.append(item)
    except Exception as e:
        print(f"Error processing price box: {e}")

# Sort results by material name for consistency
result.sort(key=lambda x: x['material'])

# Create the final JSON structure with metadata
output_data = {
    "last_update": datetime.now().isoformat(),
    "source": "recycleinme.com",
    "source_url": "https://www.recycleinme.com/scrappricelisting/Us%20Scrap%20Prices",
    "prices": result
}

with open(output_json, "w", encoding="utf-8") as f:
    json.dump(output_data, f, indent=2, ensure_ascii=False)

print(f"Extracted {len(result)} rows")
print(f"Saved to: {output_json}")
