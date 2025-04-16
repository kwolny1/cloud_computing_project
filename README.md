# Cloud Computing
1. set up aws account on https://aws.amazon.com
2. download terraform from https://developer.hashicorp.com/terraform/install
3. in cmd, go to folder with main.tf and lambda_function.zip
4. run:\
"your_path_to_downloaded_terraform\terraform.exe" init\
"your_path_to_downloaded_terraform\terraform.exe" plan\
"your_path_to_downloaded_terraform\terraform.exe" apply\
enter 'yes' value when asked
5. check aws webpage if stuff that .tf code should do is done (Lambda->Functions, DynamoDB->Tables, API Gateway->APIs)

# 📝 Notes Interface

A simple React-based interface for managing notes.

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### 1. Install Node.js  
Download and install the **LTS version** from [https://nodejs.org](https://nodejs.org)

---

### 2. Create the React App  
```bash
npx create-react-app notes-interface
cd notes-interface
```

### 3. Create a new file src/NotesInterface.js
3. Add Interface File
Put NotesInterface.js file in src: src/NotesInterface.js 

### 4.  Update App.js
Replace the contents of src/App.js with:
```
import NotesInterface from './NotesInterface';

function App() {
  return <NotesInterface />;
}

export default App;
```

### 5. Set API URL
Create a .env file in the root directory and add your API URL:

```
REACT_APP_API_URL=https://your-api-id.execute-api.eu-north-1.amazonaws.com
```
You can find your API in API Gateway > APIs > notes-api > Default endpoint

In src/NotesInterface.js, access the API URL with:

```
const API_BASE = process.env.REACT_APP_API_URL;
```

### 6. Run the App
In cmd in notes-interface file run 
```
npm start
```

Then open your browser at:
http://localhost:3000 🎉
