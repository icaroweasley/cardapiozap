from PIL import Image
import sys

input_path = sys.argv[1]
output_path = sys.argv[2]

img = Image.open(input_path)
# getbbox() returns the bounding box of the non-zero alpha pixels
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)
img.save(output_path)
