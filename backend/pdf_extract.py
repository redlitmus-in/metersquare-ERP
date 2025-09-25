from flask import Flask, request, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
import camelot
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
import cv2
import numpy as np
from PIL import Image
import base64
import io
import re
from werkzeug.utils import secure_filename
import os
import tempfile
import easyocr
import pandas as pd

app = Flask(__name__)
CORS(app)

class PDFExtractor:
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.is_scanned = self.check_if_scanned()
        # Initialize EasyOCR reader (supports multiple languages)
        self.ocr_reader = None
        
    def check_if_scanned(self):
        """Check if PDF is scanned/image-based or has embedded text"""
        doc = fitz.open(self.pdf_path)
        text_found = False
        
        for page_num in range(min(3, doc.page_count)):  # Check first 3 pages
            page = doc[page_num]
            text = page.get_text().strip()
            if len(text) > 50:  # If substantial text found
                text_found = True
                break
        
        doc.close()
        return not text_found
    
    def initialize_ocr(self, engine='easyocr'):
        """Initialize OCR engine"""
        if engine == 'easyocr' and self.ocr_reader is None:
            # EasyOCR supports multiple languages including Arabic
            self.ocr_reader = easyocr.Reader(['en', 'ar'], gpu=False)
        return self.ocr_reader
    
    def preprocess_image_for_ocr(self, image):
        """Preprocess image for better OCR results"""
        # Convert PIL Image to OpenCV format
        if isinstance(image, Image.Image):
            image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply thresholding to get better OCR results
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Denoise
        denoised = cv2.medianBlur(thresh, 1)
        
        # Deskew
        coords = np.column_stack(np.where(denoised > 0))
        if len(coords) > 0:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            
            if abs(angle) > 0.5:
                (h, w) = denoised.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                denoised = cv2.warpAffine(denoised, M, (w, h),
                                          flags=cv2.INTER_CUBIC,
                                          borderMode=cv2.BORDER_REPLICATE)
        
        return denoised
    
    def extract_with_tesseract_ocr(self):
        """Extract text using Tesseract OCR for scanned PDFs"""
        # Convert PDF to images
        images = convert_from_path(self.pdf_path, dpi=300)
        
        extracted_data = {
            "pages": [],
            "is_ocr": True,
            "ocr_engine": "tesseract"
        }
        
        for i, image in enumerate(images):
            # Preprocess image
            processed_image = self.preprocess_image_for_ocr(image)
            
            # Configure Tesseract for better results
            custom_config = r'--oem 3 --psm 6 -l eng+ara'
            
            # Extract text
            text = pytesseract.image_to_string(processed_image, config=custom_config)
            
            # Extract data with layout information
            data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT, config=custom_config)
            
            # Get image as base64 for preview
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode()
            
            page_data = {
                "page_number": i + 1,
                "text": text,
                "ocr_data": data,
                "image_preview": img_base64,
                "confidence": self.calculate_confidence(data)
            }
            
            extracted_data["pages"].append(page_data)
        
        return extracted_data
    
    def extract_with_easyocr(self):
        """Extract text using EasyOCR (better for mixed language and complex layouts)"""
        self.initialize_ocr('easyocr')
        
        # Convert PDF to images
        images = convert_from_path(self.pdf_path, dpi=300)
        
        extracted_data = {
            "pages": [],
            "is_ocr": True,
            "ocr_engine": "easyocr"
        }
        
        for i, image in enumerate(images):
            # Convert PIL Image to numpy array
            img_array = np.array(image)
            
            # Use EasyOCR to extract text
            results = self.ocr_reader.readtext(img_array)
            
            # Compile text and structured data
            text = ""
            structured_results = []
            
            for (bbox, text_content, confidence) in results:
                text += text_content + " "
                structured_results.append({
                    "bbox": bbox,
                    "text": text_content,
                    "confidence": confidence
                })
            
            # Get image as base64 for preview
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode()
            
            page_data = {
                "page_number": i + 1,
                "text": text.strip(),
                "structured_ocr": structured_results,
                "image_preview": img_base64,
                "average_confidence": np.mean([r["confidence"] for r in structured_results]) if structured_results else 0
            }
            
            extracted_data["pages"].append(page_data)
        
        return extracted_data
    
    def extract_tables_with_ocr(self):
        """Extract tables from scanned PDFs using OCR and table detection"""
        images = convert_from_path(self.pdf_path, dpi=300)
        tables_data = []
        
        for i, image in enumerate(images):
            # Convert to OpenCV format
            img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detect tables using line detection
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10)
            
            # If lines detected, likely a table
            if lines is not None and len(lines) > 10:
                # Use Tesseract with table-specific configuration
                custom_config = r'--oem 3 --psm 6'
                data = pytesseract.image_to_data(gray, output_type=pytesseract.Output.DICT, config=custom_config)
                
                # Convert to dataframe for table structure
                df = pd.DataFrame(data)
                df = df[df.conf != -1]  # Remove empty cells
                df = df[df.text.str.strip() != '']  # Remove whitespace
                
                # Group by position to form table structure
                df['row'] = df.groupby('top').ngroup()
                df['col'] = df.groupby(['row', 'left']).ngroup()
                
                # Pivot to create table
                table = df.pivot_table(index='row', columns='col', values='text', aggfunc=' '.join)
                
                tables_data.append({
                    "page": i + 1,
                    "table_data": table.to_dict('records'),
                    "html": table.to_html(index=False),
                    "csv": table.to_csv(index=False)
                })
        
        return tables_data
    
    def calculate_confidence(self, ocr_data):
        """Calculate average OCR confidence"""
        confidences = [int(conf) for conf in ocr_data['conf'] if int(conf) > 0]
        return sum(confidences) / len(confidences) if confidences else 0
    
    def extract_with_hybrid_approach(self):
        """Use hybrid approach - try regular extraction first, fall back to OCR if needed"""
        # First try regular extraction
        doc = fitz.open(self.pdf_path)
        total_text_length = 0
        
        for page in doc:
            total_text_length += len(page.get_text().strip())
        
        doc.close()
        
        # If minimal text found, use OCR
        if total_text_length < 100:
            print("Detected scanned PDF, using OCR...")
            return self.extract_with_easyocr()
        else:
            print("Detected digital PDF with embedded text...")
            return self.extract_with_pymupdf()
    
    def extract_with_pymupdf(self):
        """Original PyMuPDF extraction for digital PDFs"""
        doc = fitz.open(self.pdf_path)
        result = {
            "metadata": doc.metadata,
            "page_count": doc.page_count,
            "pages": [],
            "is_ocr": False
        }
        
        for page_num in range(doc.page_count):
            page = doc[page_num]
            
            # Get text with different formats
            page_data = {
                "page_number": page_num + 1,
                "text": page.get_text(),
                "blocks": page.get_text("blocks"),
                "dict": page.get_text("dict"),
                "dimensions": {
                    "width": page.rect.width,
                    "height": page.rect.height
                }
            }
            
            # Generate preview image
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img_base64 = base64.b64encode(pix.tobytes("png")).decode()
            page_data["image_preview"] = img_base64
            
            # Extract tables if present
            tables = page.find_tables()
            if tables:
                page_data["tables"] = []
                for table in tables:
                    page_data["tables"].append({
                        "data": table.extract(),
                        "bbox": table.bbox
                    })
            
            result["pages"].append(page_data)
        
        doc.close()
        return result
    
    def extract_boq_structure(self, use_ocr=None):
        """Extract BOQ specific structure from PDF (works with both OCR and regular PDFs)"""
        # Determine extraction method
        if use_ocr is None:
            use_ocr = self.is_scanned
        
        if use_ocr:
            content = self.extract_with_hybrid_approach()
        else:
            content = self.extract_with_pymupdf()
        
        boq_data = {
            "project_info": {},
            "sections": [],
            "summary": {},
            "terms_conditions": [],
            "total_amount": None,
            "extraction_method": "OCR" if content.get("is_ocr") else "Digital"
        }
        
        # Combine all text
        full_text = "\n".join([page["text"] for page in content["pages"]])
        
        # Clean OCR text if needed
        if content.get("is_ocr"):
            full_text = self.clean_ocr_text(full_text)
        
        # Extract project information (same patterns work for both OCR and digital)
        project_patterns = {
            "project": r"PROJECT\s*[:.]?\s*(.+?)(?:\n|$)",
            "location": r"LOCATION\s*[:.]?\s*(.+?)(?:\n|$)",
            "client": r"CLIENT\s*[:.]?\s*(.+?)(?:\n|$)",
            "area": r"Area\s*[:.]?\s*(\d+\s*SQM)",
            "ref": r"Ref\s*[:.]?\s*(.+?)(?:\n|$)"
        }
        
        for key, pattern in project_patterns.items():
            match = re.search(pattern, full_text, re.IGNORECASE | re.MULTILINE)
            if match:
                boq_data["project_info"][key] = match.group(1).strip()
        
        # Extract amounts with OCR-friendly patterns
        amount_pattern = r"(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)"
        amounts = re.findall(amount_pattern, full_text)
        
        # Find grand total
        grand_total_patterns = [
            r"GRAND\s*TOTAL.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)",
            r"Total\s*after\s*discount.*?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)",
            r"TOTAL.*?AED\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)"
        ]
        
        for pattern in grand_total_patterns:
            match = re.search(pattern, full_text, re.IGNORECASE)
            if match:
                boq_data["total_amount"] = match.group(1).replace(",", "")
                break
        
        return boq_data
    
    def clean_ocr_text(self, text):
        """Clean common OCR errors"""
        # Fix common OCR mistakes
        replacements = {
            r'\bl\b': '1',  # l to 1
            r'\bO\b': '0',  # O to 0
            r'\s+': ' ',     # Multiple spaces to single
            r'[\u2013\u2014]': '-',  # Em/en dash to hyphen
        }
        
        for pattern, replacement in replacements.items():
            text = re.sub(pattern, replacement, text)
        
        return text.strip()

@app.route('/api/extract-pdf', methods=['POST'])
def extract_pdf():
    """Main endpoint for PDF extraction with OCR support"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Save temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            file.save(tmp_file.name)
            temp_path = tmp_file.name
        
        # Initialize extractor
        extractor = PDFExtractor(temp_path)
        
        # Get extraction method from request
        method = request.form.get('method', 'auto')
        use_ocr = request.form.get('use_ocr', 'auto')
        
        result = {
            "is_scanned": extractor.is_scanned,
            "extraction_info": {
                "detected_type": "Scanned/Image PDF" if extractor.is_scanned else "Digital PDF",
                "method_used": method
            }
        }
        
        if method == 'auto' or method == 'hybrid':
            # Automatically choose best method
            result['content'] = extractor.extract_with_hybrid_approach()
            result['boq_structure'] = extractor.extract_boq_structure()
            
            # Try table extraction
            if extractor.is_scanned:
                result['tables'] = extractor.extract_tables_with_ocr()
            else:
                result['tables'] = extractor.extract_tables_with_camelot()
        
        elif method == 'ocr_tesseract':
            result['content'] = extractor.extract_with_tesseract_ocr()
            result['boq_structure'] = extractor.extract_boq_structure(use_ocr=True)
            result['tables'] = extractor.extract_tables_with_ocr()
        
        elif method == 'ocr_easyocr':
            result['content'] = extractor.extract_with_easyocr()
            result['boq_structure'] = extractor.extract_boq_structure(use_ocr=True)
        
        elif method == 'digital':
            result['content'] = extractor.extract_with_pymupdf()
            result['boq_structure'] = extractor.extract_boq_structure(use_ocr=False)
            result['tables'] = extractor.extract_tables_with_camelot()
        
        # Clean up temp file
        os.unlink(temp_path)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/extract-pdf-preview', methods=['POST'])
def extract_pdf_preview():
    """Extract PDF for preview with automatic OCR detection"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        
        # Save temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            file.save(tmp_file.name)
            temp_path = tmp_file.name
        
        # Extract content with automatic method selection
        extractor = PDFExtractor(temp_path)
        
        # Get BOQ structure
        boq_data = extractor.extract_boq_structure()
        
        # Get content with appropriate method
        if extractor.is_scanned:
            content = extractor.extract_with_easyocr()
            extraction_method = "OCR (EasyOCR)"
        else:
            content = extractor.extract_with_pymupdf()
            extraction_method = "Digital Text Extraction"
        
        # Prepare preview data
        preview_pages = []
        for page in content["pages"][:3]:  # First 3 pages for preview
            preview_pages.append({
                "page": page["page_number"],
                "text": page["text"],
                "image": page.get("image_preview", ""),
                "confidence": page.get("average_confidence", page.get("confidence", 100))
            })
        
        os.unlink(temp_path)
        
        return jsonify({
            "structured_data": boq_data,
            "preview_pages": preview_pages,
            "extraction_status": "success",
            "extraction_method": extraction_method,
            "is_scanned": extractor.is_scanned
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/check-pdf-type', methods=['POST'])
def check_pdf_type():
    """Quick check to determine if PDF is scanned or digital"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            file.save(tmp_file.name)
            temp_path = tmp_file.name
        
        extractor = PDFExtractor(temp_path)
        is_scanned = extractor.is_scanned
        
        os.unlink(temp_path)
        
        return jsonify({
            "is_scanned": is_scanned,
            "type": "Scanned/Image PDF" if is_scanned else "Digital PDF",
            "recommended_method": "OCR" if is_scanned else "Direct Extraction"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)