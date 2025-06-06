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

resource "aws_s3_bucket" "pdf_bucket_eu_west" {
  bucket = "student-notes-pdf-west"
  
  # Elimina la línea "region" y usa provider en su lugar
  provider = aws.eu_west
}

provider "aws" {
  alias  = "eu_west"
  region = "eu-west-1"
}

resource "aws_s3_bucket_public_access_block" "pdf_bucket_access" {
  bucket = aws_s3_bucket.pdf_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "cross_region_access" {
  bucket = aws_s3_bucket.pdf_bucket.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect    = "Allow",
        Principal = {
          AWS = "arn:aws:iam::711874660965:root"  # Reemplaza con tu ARN de usuario/rol
        },
        Action    = "s3:GetObject",
        Resource  = "${aws_s3_bucket.pdf_bucket.arn}/*",
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = "eu-west-1"
          }
        }
      }
    ]
  })
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

  attribute {
    name = "start_time"
    type = "S"
  }

  # Índice secundario opcional para búsquedas por fecha
  global_secondary_index {
    name            = "StartTimeIndex"
    hash_key        = "start_time"
    projection_type = "ALL"
  }
}

resource "aws_dynamodb_table" "pdf_data" {
  name         = "PDFData"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pdf_id"

  attribute {
    name = "pdf_id"
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
          "dynamodb:DeleteItem",
          "dynamodb:Scan"
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
      },
      {
        Action = "sns:Publish",
        Effect = "Allow",
        Resource = aws_sns_topic.note_notifications.arn
      },
      {
        Action = [
          "textract:AnalyzeDocument",
          "textract:DetectDocumentText"
        ],
        Effect = "Allow",
        Resource = "*"
      },
      {
        Action = [
          "comprehend:DetectSentiment",
          "comprehend:DetectEntities",
          "comprehend:DetectSyntax",
          "comprehend:DetectDominantLanguage"
        ],
        Effect = "Allow",
        Resource = "*"
      },
      {
        Action = [
          "events:PutEvents"
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
  description = "Allow Lambda to access S3 and events table, Textract, and DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetObject",
          ],
        Resource = [
          "${aws_s3_bucket.pdf_bucket.arn}",
          "${aws_s3_bucket.pdf_bucket.arn}/*"
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan"
        ],
        Resource = [
          aws_dynamodb_table.scheduled_events.arn,
          "${aws_dynamodb_table.scheduled_events.arn}/index/*"
        ]
      },
      {
        Effect = "Allow",
        Action = [
          "dynamodb:PutItem",
          "dynamodb:Scan",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ],
        Resource = aws_dynamodb_table.pdf_data.arn
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
  handler       = "lambda_function.lambda_function.lambda_handler"
  filename      = "lambda_function.zip"
  timeout       = 15

  environment {
    variables = {
      DYNAMO_TABLE = aws_dynamodb_table.study_notes.name
      EVENT_TABLE  = aws_dynamodb_table.scheduled_events.name
      PDF_DATA_TABLE = aws_dynamodb_table.pdf_data.name
      PDF_BUCKET   = aws_s3_bucket.pdf_bucket.bucket
      HF_API_KEY      = "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" 
    }
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "api" {
  name          = "notes-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]  # En producción, reemplaza con tu dominio específico
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]  # Añade más headers si es necesario
    expose_headers = ["Content-Type"]
    max_age = 3600
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

resource "aws_apigatewayv2_route" "get_notes_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /notes"
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

resource "aws_apigatewayv2_route" "get_pdfs_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /pdfs"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "delete_pdf_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "DELETE /pdf"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "schedule_event_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /schedule-event"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}


resource "aws_apigatewayv2_route" "extract_text_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /pdf/extract"  # Cambiado
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "summarize_text_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /pdf/summarize"  # Cambiado
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "get_pdf_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /pdf"  # Cambiado
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

resource "aws_sns_topic" "note_notifications" {
  name = "note-notifications"
}

resource "aws_sns_topic_subscription" "email_sub" {
  topic_arn = aws_sns_topic.note_notifications.arn
  protocol  = "email"
  endpoint  = "youremail@example.com"  # Replace with your real email
}

resource "aws_cloudwatch_event_rule" "note_created_rule" {
  name        = "note-created-rule"
  description = "Trigger Lambda when a new note is created"
  event_pattern = jsonencode({
    source = ["custom.notes"]
    detail-type = ["NoteCreated"]
  })
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.note_created_rule.name
  target_id = "summarizeLambdaTarget"
  arn       = aws_lambda_function.summarize_notes_lambda.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.summarize_notes_lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.note_created_rule.arn
}

resource "aws_s3_bucket" "react_app" {
  bucket = "notes-ai-3324"
  force_destroy = true 
}

resource "aws_s3_bucket_ownership_controls" "react_app_ownership" {
  bucket = aws_s3_bucket.react_app.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "react_app_access" {
  bucket = aws_s3_bucket.react_app.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}


resource "aws_s3_bucket_website_configuration" "react_app_website" {
  bucket = aws_s3_bucket.react_app.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }

  routing_rule {
    condition {
      http_error_code_returned_equals = "404"
    }
    redirect {
      replace_key_prefix_with = "#/"
    }
  }
}


resource "aws_s3_bucket_cors_configuration" "react_app_cors" {
  bucket = aws_s3_bucket.react_app.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_policy" "react_app_policy" {
  bucket = aws_s3_bucket.react_app.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid: "AllowCloudFrontAccess",
        Effect: "Allow",
        Principal: {
          CanonicalUser: aws_cloudfront_origin_access_identity.react_oai.s3_canonical_user_id
        },
        Action: "s3:GetObject",
        Resource: "${aws_s3_bucket.react_app.arn}/*"
      }
    ]
  })
}


resource "aws_cloudfront_distribution" "react_distribution" {
  origin {
    domain_name = aws_s3_bucket.react_app.bucket_regional_domain_name
    origin_id   = "S3-ReactApp"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.react_oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-ReactApp"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_cloudfront_origin_access_identity" "react_oai" {
  comment = "OAI for React App"
}

output "cloudfront_domain" {
  description = "The domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.react_distribution.domain_name
}

output "cloudfront_distribution_id" {
  description = "The identifier for the CloudFront distribution"
  value       = aws_cloudfront_distribution.react_distribution.id
}

output "s3_website_endpoint" {
  description = "The website endpoint for the S3 bucket"
  value       = aws_s3_bucket.react_app.website_endpoint
}

output "api_gateway_url" {
  description = "The URL of the API Gateway"
  value       = aws_apigatewayv2_stage.default.invoke_url
}