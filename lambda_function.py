import json
import boto3
import os
import uuid
import base64
from datetime import datetime
import logging
from decimal import Decimal
import urllib3
from urllib.parse import unquote_plus

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')


textract = boto3.client('textract', region_name='eu-west-1') 
notes_table = dynamodb.Table(os.environ.get('DYNAMO_TABLE', 'StudyNotes'))
events_table = dynamodb.Table(os.environ.get('EVENT_TABLE', 'ScheduledEvents'))
pdfdata_table = dynamodb.Table(os.environ.get('PDF_DATA_TABLE', 'PDFData'))
bucket_name = os.environ.get('PDF_BUCKET')

def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", event.get("httpMethod", "GET"))
    route = event.get("rawPath", "")

    if route == "/summarize" and method == "POST":
        return handle_post(event)
    elif route == "/note" and method == "GET":
        return handle_get(event)
    elif route == "/notes" and method == "GET":
        return handle_get_notes(event)
    elif route == "/note" and method == "PUT":
        return handle_update(event)
    elif route == "/note" and method == "DELETE":
        return handle_delete(event)
    elif route == "/upload-pdf" and method == "POST":
        return handle_pdf_upload(event)
    elif route == "/pdfs" and method == "GET":
        return handle_get_pdfs(event)
    elif route == "/pdf" and method == "DELETE":
        return handle_delete_pdf(event)
    elif route == "/pdf/extract" and method == "POST":
        return handle_extract_text(event)  # Sin pasar pdf_id
    
    elif route == "/pdf/summarize" and method == "POST":
        return handle_summarize_text(event)
    
    elif route == "/pdf" and method == "GET":
        return handle_get_pdf(event)
    
    elif route == "/schedule-event" and method == "POST":
        return handle_schedule_event(event)
    else:
        return _response(404, {"error": f"No handler for {method} {route}"})

def _response(status_code, body):
    def decimal_default(obj):
        if isinstance(obj, Decimal):
            return float(obj)
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
    return {
        'statusCode': status_code,
        'body': json.dumps(body, default=decimal_default),
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',  # O especifica tu dominio
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        }
    }


def handle_post(event):
    try:
        logger.info("Received event: %s", json.dumps(event))
        
        # Parseo del body más robusto
        try:
            if 'body' in event:
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            else:
                body = {}
        except json.JSONDecodeError:
            logger.error("Failed to parse request body")
            return _response(400, {'error': 'Invalid JSON in request body'})
        
        # Validación de los campos nuevos
        content = body.get('content', {})
        if not content or not isinstance(content, dict):
            return _response(400, {'error': 'Invalid content format. Expected JSON object'})

        try:
            item = {
                'note_id': str(uuid.uuid4()),
                'title': body.get('title', ''),  # Campo opcional
                'content': content,  # El contenido en formato JSON
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Validación adicional del contenido
            if not item['content'].get('type') == 'doc':
                logger.warning("Content might not be in Tiptap format")
            
            notes_table.put_item(Item=item)
            return _response(200, item)
            
        except Exception as e:
            logger.error(f"Error processing request: {str(e)}")
            return _response(500, {'error': 'Failed to process note', 'details': str(e)})
            
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        return _response(500, {'error': 'Internal server error', 'details': str(e)})

def handle_get(event):
    note_id = event.get('queryStringParameters', {}).get('note_id')
    if not note_id:
        return {'statusCode': 400, 'body': json.dumps({'error': 'note_id required'})}

    res = notes_table.get_item(Key={'note_id': note_id})
    item = res.get('Item')
    if not item:
        return {'statusCode': 404, 'body': json.dumps({'error': 'Note not found'})}

    return _response(200, item)

def handle_get_notes(event):
    try:
        # Escanear la tabla para obtener todos los items
        response = notes_table.scan()
        items = response.get('Items', [])
        
        # Si hay más datos (paginación DynamoDB)
        while 'LastEvaluatedKey' in response:
            response = notes_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        
        return _response(200, {"notes": items})
    except Exception as e:
        logger.error(f"Error getting all notes: {str(e)}")
        return _response(500, {'error': 'Failed to get notes', 'details': str(e)})

def handle_update(event):
    body = json.loads(event.get('body', '{}'))
    note_id = body.get('note_id')
    content = body.get('content')

    if not note_id or not content:
        return {'statusCode': 400, 'body': json.dumps({'error': 'note_id and text required'})}

    # You can update original_text or key_phrases or both
    notes_table.update_item(
    Key={'note_id': note_id},
    UpdateExpression="SET title = :t, content = :c, updated_at = :u",
    ExpressionAttributeValues={
        ':t': body.get('title'),
        ':c': body.get('content'),
        ':u': datetime.utcnow().isoformat()
    }
)

    return {'statusCode': 200, 'body': json.dumps({'message': 'Note updated'})}



def handle_delete(event):
    note_id = event.get('queryStringParameters', {}).get('note_id')
    if not note_id:
        return {'statusCode': 400, 'body': json.dumps({'error': 'note_id required'})}

    notes_table.delete_item(Key={'note_id': note_id})
    return {'statusCode': 200, 'body': json.dumps({'message': 'Note deleted'})}

def handle_pdf_upload(event):
    try:
        content_type = event['headers'].get('content-type') or event['headers'].get('Content-Type')
        if not content_type or 'multipart/form-data' not in content_type:
            return _response(400, {"error": "Expected multipart/form-data"})

        file_content = base64.b64decode(event['body'])
        
        filename = "document.pdf"
        if b'filename=' in file_content:
            filename_part = file_content.split(b'filename="')[1].split(b'"')[0].decode()
            filename = filename_part if filename_part.endswith('.pdf') else filename

        # 3. Generar un nombre único en S3
        s3_key = f"uploads/{str(uuid.uuid4())}_{filename}"  

        # Subir a S3
        s3.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=file_content,
            ContentType='application/pdf'
        )

        try: 
            # 3. Validar datos antes de insertar
            item = {
                'pdf_id': str(uuid.uuid4()),
                'filename': str(filename),
                'upload_date': datetime.utcnow().isoformat(),
                's3_key': str(s3_key),
                'extracted': "", 
                'summarized': "", 
                'size': Decimal(str(len(file_content) / 1024))
            }
            
            # 4. Intentar insertar con manejo de errores
            response = pdfdata_table.put_item(
                Item=item,
                ReturnConsumedCapacity='TOTAL'
            )
            
            logger.info(f"DynamoDB response: {response}")
            return _response(200, {"message": "Success", "item": item})
        
        except Exception as e:
            logger.error(f"Full error: {str(e)}", exc_info=True)
            return _response(500, {
                "error": "DynamoDB operation failed",
                "details": str(e),
            })
    
    except Exception as e:
        logger.error(f"PDF upload error: {e}")
        return _response(500, {"error": "Upload failed", "details": str(e)})

def handle_get_pdf(event):
    pdf_id = event.get('queryStringParameters', {}).get('pdf_id')
    if not pdf_id:
            return _response(400, {"error": "pdf_id is required"})
    try:
        response = pdfdata_table.get_item(Key={'pdf_id': pdf_id})
        if 'Item' not in response:
            return _response(404, {"error": "PDF not found"})
        
        return _response(200, response['Item'])
    
    except Exception as e:
        logger.error(f"Get PDF error: {str(e)}")
        return _response(500, {"error": str(e)})


def handle_get_pdfs(event):
    try:
        # Escanear la tabla de DynamoDB donde guardas los metadatos de los PDFs
        response = dynamodb.Table('PDFData').scan()
        
        # Formatear la respuesta
        pdfs = []
        for item in response.get('Items', []):
            pdfs.append({
                'id': item['pdf_id'],
                'name': item['filename'],
                'uploadDate': item['upload_date'],
                'size': item.get('size', 0),
                's3Key': item['s3_key']
            })
        
        return _response(200, {'files': pdfs})
        
    except Exception as e:
        logger.error(f"Error listing PDFs: {str(e)}")
        return _response(500, {'error': 'Failed to list PDFs'})
    
def handle_delete_pdf(event):
    try:
        # 1. Obtener metadatos del PDF de DynamoDB
        pdf_id = event.get('queryStringParameters', {}).get('pdf_id')
        if not pdf_id:
            return {'statusCode': 400, 'body': json.dumps({'error': 'note_id required'})}

        response = pdfdata_table.get_item(Key={'pdf_id': pdf_id})
        if 'Item' not in response:
            return _response(404, {'error': 'PDF not found','response': response})
        
        s3_key = response['Item']['s3_key']
        
        # 2. Eliminar de S3
        s3.delete_object(Bucket=bucket_name, Key=s3_key)
        
        # 3. Eliminar de DynamoDB
        pdfdata_table.delete_item(Key={'pdf_id': pdf_id})
        
        return _response(200, {'message': 'PDF deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting PDF: {str(e)}")
        return _response(500, {'error': 'Failed to delete PDF'})

def handle_extract_text(event):
    try:
        # 1. Obtener parámetros
        pdf_id = event.get('queryStringParameters', {}).get('pdf_id')
        if not pdf_id:
            return _response(400, {"error": "pdf_id is required"})

        # 2. Obtener metadatos del PDF
        pdf_data = pdfdata_table.get_item(Key={'pdf_id': pdf_id})
        if 'Item' not in pdf_data:
            return _response(404, {"error": "PDF not found"})
        
        s3_key = unquote_plus(pdf_data['Item']['s3_key'])  # Decodificar caracteres especiales
        
        # 3. Descargar el PDF a memoria
        try:
            pdf_file = s3.get_object(Bucket=bucket_name, Key=s3_key)
            raw_bytes = pdf_file['Body'].read()
        except Exception as e:
            logger.error(f"Error downloading PDF: {str(e)}")
            return _response(500, {"error": "Failed to download PDF"})

        # 4. Limpieza MEJORADA del contenido multipart
        try:
            # Detección más robusta del boundary
            boundary_start = raw_bytes.find(b'------WebKitFormBoundary')
            if boundary_start == -1:
                # No es multipart, usar directamente
                pdf_bytes = raw_bytes
            else:
                # Encontrar el primer salto de línea después del boundary
                first_newline = raw_bytes.find(b'\r\n\r\n', boundary_start)
                if first_newline == -1:
                    first_newline = raw_bytes.find(b'\n\n', boundary_start)
                
                if first_newline == -1:
                    raise ValueError("No se pudo encontrar el inicio del contenido PDF")
                
                # El PDF comienza después de los headers
                pdf_start = first_newline + 4 if b'\r\n\r\n' in raw_bytes else first_newline + 2
                
                # Buscar el boundary final
                boundary_end = raw_bytes.rfind(b'------WebKitFormBoundary', pdf_start)
                if boundary_end == -1:
                    raise ValueError("No se encontró el boundary final")
                
                # Buscar el EOF del PDF antes del boundary final
                pdf_eof = raw_bytes.rfind(b'%%EOF', 0, boundary_end)
                if pdf_eof == -1:
                    raise ValueError("No se encontró el marcador EOF del PDF")
                
                # Ajustar para incluir toda la línea del EOF
                eof_end = raw_bytes.find(b'\n', pdf_eof) + 1
                
                # Extraer el PDF limpio
                pdf_bytes = raw_bytes[pdf_start:eof_end]
            
            # Verificación EXTRA de integridad
            if not pdf_bytes.startswith(b'%PDF-'):
                raise ValueError(f"Encabezado PDF no válido. Inicia con: {pdf_bytes[:20]}")
            
            if not pdf_bytes.rstrip().endswith(b'%%EOF'):
                raise ValueError(f"Final PDF no válido. Termina con: {pdf_bytes[-20:]}")

        except Exception as e:
            logger.error(f"Error cleaning PDF: {str(e)}")
            return _response(500, {"error": "Failed to process PDF content"})

        # 5. Verificación final del PDF
        if not pdf_bytes.startswith(b'%PDF-'):
            return _response(400, {
                "error": "Invalid PDF after cleaning",
                "debug": f"First bytes: {pdf_bytes[:20].hex()}"
            })

        # 5. Procesar con Textract (en eu-west-1)
        try:
            response = textract.detect_document_text(
                Document={'Bytes': pdf_bytes}
            )
        except Exception as e:
            logger.error(f"Textract error: {str(e)}")
            return _response(500, {
                "error": "Textract processing failed",
                "details": str(e),
                "debug": f"PDF size: {len(pdf_bytes)} bytes"
            })

        # 6. Extraer texto
        extracted_text = "\n".join(
            block['Text'] for block in response.get('Blocks', [])
            if block['BlockType'] == 'LINE'
        )

        # 7. Actualizar DynamoDB
        pdfdata_table.update_item(
            Key={'pdf_id': pdf_id},
            UpdateExpression="SET extracted = :text",
            ExpressionAttributeValues={':text': extracted_text}
        )

        return _response(200, {
            "message": "Text extracted successfully",
            "extracted_text": extracted_text
        })

    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return _response(500, {"error": "Internal server error"})
    
def handle_summarize_text(event):
    try:
        #pdf_id = event['pathParameters']['pdf_id']
        pdf_id = event.get('queryStringParameters', {}).get('pdf_id')

        # 1. Obtener texto extraído
        pdf_data = pdfdata_table.get_item(Key={'pdf_id': pdf_id})
        extracted_text = pdf_data['Item']['extracted']
        
        if not extracted_text:
            return _response(400, {"error": "No extracted text available"})
        
        # 2. Usar HuggingFace Inference API (alternativa serverless)
        api_url = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
        headers = {"Authorization": f"Bearer {os.environ['HF_API_KEY']}"}
        """response = requests.post(
            api_url,
            headers=headers,
            json={"inputs": extracted_text}
        )
        """

        http = urllib3.PoolManager()
        response = http.request(
            "POST",
            "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
            body=json.dumps({"inputs": extracted_text}),
            headers={
                "Authorization": f"Bearer {os.environ['HF_API_KEY']}",
                "Content-Type": "application/json"
            }
        )

        summary = json.loads(response.data.decode('utf-8'))[0]['summary_text']
        
        # 3. Actualizar DynamoDB
        dynamodb.Table('PDFData').update_item(
            Key={'pdf_id': pdf_id},
            UpdateExpression="SET summarized = :summary",
            ExpressionAttributeValues={':summary': summary}
        )
        
        return _response(200, {"summarized": summary})
    
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        return _response(500, {"error": str(e)})

def handle_schedule_event(event):
    try:
        data = json.loads(event['body'])
        event_id = str(uuid.uuid4())
        title = data.get('title')
        description = data.get('description')
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if not title or not start_time or not end_time:
            return _response(400, {"error": "Missing required fields: title, start_time or end_time"})

        item = {
            "event_id": event_id,
            "title": title,
            "description": description or "",  # Campo opcional
            "start_time": start_time,
            "end_time": end_time,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        events_table.put_item(Item=item)
        return _response(200, item)
    except Exception as e:
        logger.error(f"Schedule error: {e}")
        return _response(500, {"error": "Failed to schedule event", "details": str(e)})
