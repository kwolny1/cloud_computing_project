import json
import boto3
import os
import uuid
from datetime import datetime
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('DYNAMO_TABLE', 'StudyNotes'))

def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", event.get("httpMethod", "GET"))

    if method == 'POST':
        return handle_post(event)
    elif method == 'GET':
        return handle_get(event)
    elif method == 'PUT':
        return handle_update(event)
    elif method == 'DELETE':
        return handle_delete(event)
    else:
        return {
            'statusCode': 405,
            'body': json.dumps({'error': f'Method {method} not allowed'})
        }
    
def _response(status_code, body):
    return {
        'statusCode': status_code,
        'body': json.dumps(body)
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
            
            table.put_item(Item=item)
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

    res = table.get_item(Key={'note_id': note_id})
    item = res.get('Item')
    if not item:
        return {'statusCode': 404, 'body': json.dumps({'error': 'Note not found'})}

    return _response(200, item)

def handle_update(event):
    body = json.loads(event.get('body', '{}'))
    note_id = body.get('note_id')
    updated_text = body.get('text')

    if not note_id or not updated_text:
        return {'statusCode': 400, 'body': json.dumps({'error': 'note_id and text required'})}

    # You can update original_text or key_phrases or both
    table.update_item(
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

    table.delete_item(Key={'note_id': note_id})
    return {'statusCode': 200, 'body': json.dumps({'message': 'Note deleted'})}
