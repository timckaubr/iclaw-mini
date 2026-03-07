import os
import pypandoc
from flask import Flask, render_template, request, send_file
from werkzeug.utils import secure_filename
import logging
import re

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'

# Ensure the upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def clean_mathtype_latex(text):
    """
    Strips MathType specific comments and metadata from the pasted LaTeX.
    MathType often adds lines starting with % MathType!
    """
    # Remove lines starting with % MathType
    lines = text.splitlines()
    cleaned_lines = [line for line in lines if not line.strip().startswith('% MathType')]
    return "\n".join(cleaned_lines)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    temp_input_path = None
    output_filename = 'converted_document.docx'
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)

    try:
        # 1. Handle File Upload
        if 'file' in request.files and request.files['file'].filename != '':
            file = request.files['file']
            filename = secure_filename(file.filename)
            temp_input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(temp_input_path)
            logger.info(f"Received file: {filename}")
        
        # 2. Handle Textarea Input
        elif 'latex_code' in request.form and request.form['latex_code'].strip() != '':
            latex_code = request.form['latex_code'].strip()
            
            # Clean MathType metadata if present
            latex_code = clean_mathtype_latex(latex_code)
            
            temp_input_path = os.path.join(app.config['UPLOAD_FOLDER'], 'input_text.tex')
            
            with open(temp_input_path, 'w', encoding='utf-8') as f:
                if '\\documentclass' not in latex_code:
                    # Header with common math packages
                    header = (
                        '\\documentclass{article}\n'
                        '\\usepackage[utf8]{inputenc}\n'
                        '\\usepackage{amsmath}\n'
                        '\\usepackage{amsfonts}\n'
                        '\\usepackage{amssymb}\n'
                        '\\begin{document}\n'
                    )
                    f.write(header)
                    
                    # If the user didn't use any LaTeX math markers, 
                    # wrap the whole thing in a display math block
                    if '$' not in latex_code and '\\begin{' not in latex_code and '\\[' not in latex_code:
                        f.write('\\[\n' + latex_code + '\n\\]')
                    else:
                        f.write(latex_code)
                        
                    f.write('\n\\end{document}')
                else:
                    f.write(latex_code)
            logger.info("Received text input")

        if not temp_input_path:
            return "No LaTeX code or file provided", 400

        # 3. Perform conversion using pandoc
        extra_args = [
            '--standalone',
            '--from=latex',
            '--to=docx'
        ]

        logger.info(f"Converting {temp_input_path} to DOCX...")
        pypandoc.convert_file(temp_input_path, 'docx', outputfile=output_path, extra_args=extra_args)
        
        if os.path.exists(output_path):
            logger.info("Conversion successful")
            return send_file(output_path, as_attachment=True)
        else:
            return "Conversion failed: Output file not created", 500

    except Exception as e:
        logger.error(f"Conversion error: {str(e)}")
        return f"Error during conversion: {str(e)}", 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
