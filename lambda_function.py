import json
import boto3
import os
import uuid
import base64
from datetime import datetime
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

notes_table = dynamodb.Table(os.environ.get('DYNAMO_TABLE', 'StudyNotes'))
events_table = dynamodb.Table(os.environ.get('EVENT_TABLE', 'ScheduledEvents'))
bucket_name = os.environ.get('PDF_BUCKET')

def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", event.get("httpMethod", "GET"))
    route = event.get("rawPath", "")

    if route == "/summarize" and method == "POST":
        return handle_post(event)
    elif route == "/note" and method == "GET":
        return handle_get(event)
    elif route == "/notes" and method == "GET":  # Nueva ruta
        return handle_get_notes(event)
    elif route == "/note" and method == "PUT":
        return handle_update(event)
    elif route == "/note" and method == "DELETE":
        return handle_delete(event)
    elif route == "/upload-pdf" and method == "POST":
        return handle_pdf_upload(event)
    elif route == "/schedule-event" and method == "POST":
        return handle_schedule_event(event)
    else:
        return _response(404, {"error": f"No handler for {method} {route}"})

def _response(status_code, body):
    return {
        'statusCode': status_code,
        'body': json.dumps(body),
        'headers': {'Content-Type': 'application/json'}
    }


def handle_post(event):
    try:
        logger.info("Received event: %s", json.dumps(event))
        # comprehend = boto3.client('comprehend')
        
        # More robust body parsing
        try:
            if 'body' in event:
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            else:
                body = {}
        except json.JSONDecodeError:
            logger.error("Failed to parse request body")
            return _response(400, {'error': 'Invalid JSON in request body'})
        
        user_text = body.get('text', '')
        
        if not user_text.strip():
            return _response(400, {'error': 'No text provided.'})

        try:
            # response = comprehend.detect_key_phrases(Text=user_text, LanguageCode='en')
            # key_phrases = [p['Text'] for p in response['KeyPhrases']]
            
            item = {
                'note_id': str(uuid.uuid4()),
                'original_text': user_text,
                'key_phrases': "Unavailable in this region",
                'created_at': datetime.utcnow().isoformat()
            }
            
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
    updated_text = body.get('text')

    if not note_id or not updated_text:
        return {'statusCode': 400, 'body': json.dumps({'error': 'note_id and text required'})}

    # You can update original_text or key_phrases or both
    notes_table.update_item(
        Key={'note_id': note_id},
        UpdateExpression="SET original_text = :t, updated_at = :u",
        ExpressionAttributeValues={
            ':t': updated_text,
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

        body = base64.b64decode(event['body'])
        filename = f"{str(uuid.uuid4())}.pdf"

        s3.put_object(Bucket=bucket_name, Key=filename, Body=body, ContentType='application/pdf')

        return _response(200, {"message": "PDF uploaded successfully", "file": filename})
    except Exception as e:
        logger.error(f"PDF upload error: {e}")
        return _response(500, {"error": "Upload failed", "details": str(e)})

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
