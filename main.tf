provider "aws" {
  region = "eu-north-1"
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 for PDF uploads
resource "aws_s3_bucket" "pdf_bucket" {
  bucket = "student-notes-pdf-${random_id.bucket_suffix.hex}"
}

# DynamoDB for notes
resource "aws_dynamodb_table" "study_notes" {
  name         = "StudyNotes"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "note_id"

  attribute {
    name = "note_id"
    type = "S"
  }
}

# DynamoDB for scheduled events
resource "aws_dynamodb_table" "scheduled_events" {
  name         = "ScheduledEvents"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "event_id"

  attribute {
    name = "event_id"
    type = "S"
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_exec_role" {
  name = "lambda_exec_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Lambda policy for DynamoDB, Comprehend, Logs
resource "aws_iam_policy" "lambda_policy" {
  name        = "lambda_dynamodb_comprehend_policy"
  description = "Allow Lambda to use DynamoDB and Comprehend"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ],
        Effect   = "Allow",
        Resource = aws_dynamodb_table.study_notes.arn
      },
      {
        Action = [
          "comprehend:DetectKeyPhrases"
        ],
        Effect   = "Allow",
        Resource = "*"
      },
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Effect   = "Allow",
        Resource = "*"
      }
    ]
  })
}

# Extra policy for S3 and events table
resource "aws_iam_policy" "lambda_pdf_event_policy" {
  name        = "lambda_pdf_event_policy"
  description = "Allow Lambda to access S3 and events table"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = ["s3:PutObject"],
        Resource = "${aws_s3_bucket.pdf_bucket.arn}/*"
      },
      {
        Effect = "Allow",
        Action = ["dynamodb:PutItem"],
        Resource = aws_dynamodb_table.scheduled_events.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}

resource "aws_iam_role_policy_attachment" "lambda_pdf_event_attachment" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_pdf_event_policy.arn
}

# Lambda function
resource "aws_lambda_function" "summarize_notes_lambda" {
  function_name = "summarize_notes_lambda"
  runtime       = "python3.9"
  role          = aws_iam_role.lambda_exec_role.arn
  handler       = "lambda_function.lambda_handler"
  filename      = "lambda_function.zip"
  timeout       = 15

  environment {
    variables = {
      DYNAMO_TABLE = aws_dynamodb_table.study_notes.name
      EVENT_TABLE  = aws_dynamodb_table.scheduled_events.name
      PDF_BUCKET   = aws_s3_bucket.pdf_bucket.bucket
    }
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "api" {
  name          = "notes-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type"]
  }
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.summarize_notes_lambda.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "post_note_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /summarize"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "get_note_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /note"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "update_note_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "PUT /note"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "delete_note_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "DELETE /note"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "upload_pdf_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /upload-pdf"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "schedule_event_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /schedule-event"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "allow_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.summarize_notes_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
