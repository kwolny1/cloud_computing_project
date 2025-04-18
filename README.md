# 📝 Notes Interface - Cloud Computing Project

A React-based interface for managing notes with AWS backend (Lambda, DynamoDB, API Gateway, S3, and CloudFront).

## 🌐 AWS Infrastructure Setup

### Set up AWS account
Create an account at https://aws.amazon.com

### Install Terraform
Download from https://developer.hashicorp.com/terraform/install

### Initialize and deploy infrastructure
In your project directory (where main.tf is located):

```bash
terraform init
terraform plan
terraform apply
```
Enter yes when prompted.

### Verify resources
Check the AWS console for created resources:

- Lambda → Functions
- DynamoDB → Tables
- API Gateway → APIs
- S3 → Buckets
- CloudFront → Distributions

### Get CloudFront URL
After deployment, run:

```bash
terraform output cloudfront_domain
```
This will display your production URL.

## 💻 Frontend Development Setup

### Prerequisites
Node.js LTS version from https://nodejs.org

### Installation
Install dependencies
Navigate to notes-interface folder and run:

```bash
npm install
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install react-router-dom @mui/x-date-pickers date-fns axios
```

### Configure environment
Create a .env file in notes-interface with:

env
"REACT_APP_API_URL=https://your-api-id.execute-api.eu-north-1.amazonaws.com"
Find your API endpoint in AWS Console → API Gateway → APIs → notes-api → Stages → $default → Invoke URL

### Run development server

```bash
npm start
```
The app will open at http://localhost:3000

### Production Build
Create production build

```bash
npm run build
```

Deploy to S3

```bash
aws s3 sync build/ s3://your-bucket-name --delete
```

🚀 Project Structure

/
├── main.tf                 # Terraform infrastructure
├── lambda_function.py      # Lambda function code
└── notes-interface/        # React frontend
    ├── public/             # Static files
    ├── src/                # Source code
    │   ├── components/     # React components
    │   ├── services/       # API service layer
    │   └── App.js          # Main application
    ├── package.json        # Dependencies
    └── .env                # Environment variables

🔧 Troubleshooting

CloudFront not updating?
Create cache invalidation:

```bash
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths \"/*\"
```

API Gateway CORS issues?
Verify CORS settings in main.tf and ensure your .env has the correct API URL.

React Router not working?
Ensure you're using either:

- HashRouter for S3 hosting, or
- BrowserRouter with proper CloudFront error page redirects

The production app will be available at the CloudFront URL after deployment
